const { getCollection, getClient } = require("../db/mongo");
const customerService = require("./customerService");
const productService = require("./productService");
const { validateUnitType, convertToPieces } = require("../utils/unitConversion");
const { roundMoney } = require("../utils/money");
const { generateReturnNumber } = require("../utils/invoiceNumberService");

function getReturnsCollection() {
    return getCollection("returns");
}

function getSalesCollection() {
    return getCollection("sales");
}

function buildValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function isTransactionUnsupportedError(error) {
    const message = String(error?.message || "");
    return message.includes("Transaction numbers are only allowed") || message.includes("replica set member");
}

function assertNoDuplicateProducts(items) {
    const seenProductIds = new Set();

    for (const item of items) {
        const productId = String(item.product_id || "");

        if (seenProductIds.has(productId)) {
            throw buildValidationError("The same product cannot be returned twice in one request");
        }

        seenProductIds.add(productId);
    }
}

function buildDateRangeFilter({ from, to }) {
    if (!from && !to) {
        return null;
    }

    const createdAt = {};

    if (from) {
        createdAt.$gte = new Date(from);
    }

    if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        createdAt.$lte = endDate;
    }

    return { created_at: createdAt };
}

async function getSaleForReturn(id) {
    const sale = await getSalesCollection().findOne({ _id: productService.toObjectId(id) });

    if (!sale) {
        const error = new Error("Sale not found");
        error.statusCode = 404;
        throw error;
    }

    return sale;
}

async function fetchProductsForReturn(returnItems) {
    const uniqueProductIds = [...new Set(returnItems.map((item) => String(item.product_id)))];
    const products = await Promise.all(uniqueProductIds.map((id) => productService.getProductById(id)));

    return new Map(products.map((product) => [String(product._id), product]));
}

function buildReturnLineItems({ sale, returnItems, productsById }) {
    const saleItemsByProductId = new Map(sale.items.map((item) => [String(item.product_id), item]));

    const draftLineItems = returnItems.map((requestedItem) => {
        const saleItem = saleItemsByProductId.get(String(requestedItem.product_id));

        if (!saleItem) {
            throw buildValidationError("One or more return items do not belong to the selected sale");
        }

        const product = productsById.get(String(requestedItem.product_id));
        const unitType = validateUnitType(requestedItem.unit_type || saleItem.unit_type);
        const quantity = Number(requestedItem.quantity);
        const returnedQuantityPieces = convertToPieces({
            quantity,
            unitType,
            product,
        });

        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw buildValidationError("Return quantity must be greater than zero");
        }

        const remainingReturnablePieces =
            Number(saleItem.quantity_pieces || 0) - Number(saleItem.returned_quantity_pieces || 0);

        if (returnedQuantityPieces <= 0) {
            throw buildValidationError("Return quantity must be greater than zero");
        }

        if (returnedQuantityPieces > remainingReturnablePieces) {
            throw buildValidationError(
                `Cannot return more than the remaining quantity for ${saleItem.product_name}`
            );
        }

        const grossAmountRefunded = roundMoney(Number(saleItem.sale_price || 0) * returnedQuantityPieces);
        const companyDiscountAmountRefunded = roundMoney(
            (grossAmountRefunded * Number(saleItem.company_discount_rate || 0)) / 100
        );
        const finalAmountRefunded = roundMoney(grossAmountRefunded - companyDiscountAmountRefunded);
        const companyCommissionAmountRefunded = roundMoney(
            Number(saleItem.company_commission_per_piece || 0) * returnedQuantityPieces
        );
        const profitLossRefunded = roundMoney(
            finalAmountRefunded - Number(saleItem.purchase_price || 0) * returnedQuantityPieces
        );

        return {
            product_id: saleItem.product_id,
            product_code: saleItem.product_code,
            product_reference_id: saleItem.product_reference_id,
            product_name: saleItem.product_name,
            sold_quantity: saleItem.quantity,
            sold_quantity_pieces: saleItem.quantity_pieces,
            already_returned_quantity_pieces: saleItem.returned_quantity_pieces || 0,
            remaining_returnable_quantity_pieces: remainingReturnablePieces,
            returned_quantity: quantity,
            unit_type: unitType,
            returned_quantity_pieces: returnedQuantityPieces,
            purchase_price: roundMoney(saleItem.purchase_price),
            sale_price: roundMoney(saleItem.sale_price),
            gross_amount_refunded: grossAmountRefunded,
            company_discount_rate: Number(saleItem.company_discount_rate || 0),
            company_discount_amount_refunded: companyDiscountAmountRefunded,
            dealer_discount_amount_refunded: 0,
            final_amount_refunded: finalAmountRefunded,
            company_commission_per_piece: roundMoney(saleItem.company_commission_per_piece || 0),
            company_commission_amount_refunded: companyCommissionAmountRefunded,
            profit_loss_refunded: profitLossRefunded,
        };
    });

    const originalSubtotalAfterCompanyDiscount = roundMoney(
        Number(sale.subtotal_after_company_discount || 0) ||
            sale.items.reduce(
                (sum, item) => sum + Number(item.net_amount_before_dealer_discount || 0),
                0
            )
    );
    const returnedSubtotalAfterCompanyDiscount = roundMoney(
        draftLineItems.reduce((sum, item) => sum + item.final_amount_refunded, 0)
    );
    const totalDealerDiscountRefunded =
        originalSubtotalAfterCompanyDiscount > 0
            ? roundMoney(
                  (roundMoney(sale.total_dealer_discount || 0) * returnedSubtotalAfterCompanyDiscount) /
                      originalSubtotalAfterCompanyDiscount
              )
            : 0;

    if (draftLineItems.length === 1) {
        const onlyItem = draftLineItems[0];
        const finalAmountRefunded = roundMoney(
            onlyItem.final_amount_refunded - totalDealerDiscountRefunded
        );

        return [
            {
                ...onlyItem,
                dealer_discount_amount_refunded: totalDealerDiscountRefunded,
                final_amount_refunded: finalAmountRefunded,
                profit_loss_refunded: roundMoney(
                    finalAmountRefunded -
                        Number(onlyItem.purchase_price || 0) * onlyItem.returned_quantity_pieces
                ),
            },
        ];
    }

    const finalizedLineItems = [];
    let dealerDiscountAllocatedSoFar = 0;

    for (let index = 0; index < draftLineItems.length; index += 1) {
        const item = draftLineItems[index];
        let dealerDiscountAmountRefunded = 0;

        if (returnedSubtotalAfterCompanyDiscount > 0) {
            if (index === draftLineItems.length - 1) {
                dealerDiscountAmountRefunded = roundMoney(
                    totalDealerDiscountRefunded - dealerDiscountAllocatedSoFar
                );
            } else {
                dealerDiscountAmountRefunded = roundMoney(
                    (item.final_amount_refunded / returnedSubtotalAfterCompanyDiscount) *
                        totalDealerDiscountRefunded
                );
            }
        }

        dealerDiscountAllocatedSoFar = roundMoney(
            dealerDiscountAllocatedSoFar + dealerDiscountAmountRefunded
        );

        const finalAmountRefunded = roundMoney(
            item.final_amount_refunded - dealerDiscountAmountRefunded
        );

        finalizedLineItems.push({
            ...item,
            dealer_discount_amount_refunded: dealerDiscountAmountRefunded,
            final_amount_refunded: finalAmountRefunded,
            profit_loss_refunded: roundMoney(
                finalAmountRefunded -
                    Number(item.purchase_price || 0) * item.returned_quantity_pieces
            ),
        });
    }

    return finalizedLineItems;
}

function buildReturnTotals(lineItems) {
    return {
        subtotal_after_company_discount_refunded: roundMoney(
            lineItems.reduce(
                (sum, item) =>
                    sum +
                    (Number(item.final_amount_refunded || 0) +
                        Number(item.dealer_discount_amount_refunded || 0)),
                0
            )
        ),
        total_amount_refunded: roundMoney(
            lineItems.reduce((sum, item) => sum + item.final_amount_refunded, 0)
        ),
        total_dealer_discount_refunded: roundMoney(
            lineItems.reduce((sum, item) => sum + item.dealer_discount_amount_refunded, 0)
        ),
        total_company_discount_refunded: roundMoney(
            lineItems.reduce((sum, item) => sum + item.company_discount_amount_refunded, 0)
        ),
        total_company_commission_refunded: roundMoney(
            lineItems.reduce((sum, item) => sum + item.company_commission_amount_refunded, 0)
        ),
        profit_loss_refunded: roundMoney(
            lineItems.reduce((sum, item) => sum + item.profit_loss_refunded, 0)
        ),
        total_quantity_pieces_refunded: lineItems.reduce(
            (sum, item) => sum + item.returned_quantity_pieces,
            0
        ),
    };
}

function deriveReturnStatus(updatedSaleItems) {
    const totalReturnedPieces = updatedSaleItems.reduce(
        (sum, item) => sum + Number(item.returned_quantity_pieces || 0),
        0
    );

    if (totalReturnedPieces === 0) {
        return "not_returned";
    }

    const isFullyReturned = updatedSaleItems.every(
        (item) => Number(item.returned_quantity_pieces || 0) >= Number(item.quantity_pieces || 0)
    );

    return isFullyReturned ? "fully_returned" : "partially_returned";
}

function buildUpdatedSaleState(sale, returnLineItems) {
    const returnItemsByProductId = new Map(returnLineItems.map((item) => [String(item.product_id), item]));

    const updatedItems = sale.items.map((saleItem) => {
        const matchedReturnItem = returnItemsByProductId.get(String(saleItem.product_id));

        if (!matchedReturnItem) {
            return saleItem;
        }

        return {
            ...saleItem,
            returned_quantity_pieces: Number(saleItem.returned_quantity_pieces || 0) + matchedReturnItem.returned_quantity_pieces,
        };
    });

    const updatedReturnSummary = {
        returned_amount: roundMoney(
            Number(sale.return_summary?.returned_amount || 0) +
                returnLineItems.reduce((sum, item) => sum + item.final_amount_refunded, 0)
        ),
        returned_quantity_pieces:
            Number(sale.return_summary?.returned_quantity_pieces || 0) +
            returnLineItems.reduce((sum, item) => sum + item.returned_quantity_pieces, 0),
        returned_company_discount: roundMoney(
            Number(sale.return_summary?.returned_company_discount || 0) +
                returnLineItems.reduce((sum, item) => sum + item.company_discount_amount_refunded, 0)
        ),
        returned_dealer_discount: roundMoney(
            Number(sale.return_summary?.returned_dealer_discount || 0) +
                returnLineItems.reduce((sum, item) => sum + item.dealer_discount_amount_refunded, 0)
        ),
        returned_company_commission: roundMoney(
            Number(sale.return_summary?.returned_company_commission || 0) +
                returnLineItems.reduce((sum, item) => sum + item.company_commission_amount_refunded, 0)
        ),
        returned_profit_loss: roundMoney(
            Number(sale.return_summary?.returned_profit_loss || 0) +
                returnLineItems.reduce((sum, item) => sum + item.profit_loss_refunded, 0)
        ),
    };

    return {
        items: updatedItems,
        return_status: deriveReturnStatus(updatedItems),
        return_summary: updatedReturnSummary,
    };
}

async function restoreStocks(lineItems, session) {
    const productsCollection = getCollection("products");

    for (const item of lineItems) {
        await productsCollection.updateOne(
            { _id: item.product_id },
            {
                $inc: { current_stock_pieces: item.returned_quantity_pieces },
                $set: { lastUpdatedAt: new Date() },
            },
            session ? { session } : undefined
        );
    }
}

async function revertRestoredStocks(lineItems) {
    const productsCollection = getCollection("products");

    await Promise.all(
        lineItems.map((item) =>
            productsCollection.updateOne(
                { _id: item.product_id, current_stock_pieces: { $gte: item.returned_quantity_pieces } },
                {
                    $inc: { current_stock_pieces: -item.returned_quantity_pieces },
                    $set: { lastUpdatedAt: new Date() },
                }
            )
        )
    );
}

async function createReturn(payload) {
    const requestedItems = Array.isArray(payload.items) ? payload.items : [];

    if (!payload.original_sale_id) {
        throw buildValidationError("Original sale is required");
    }

    if (requestedItems.length === 0) {
        throw buildValidationError("At least one product must be selected for return");
    }

    assertNoDuplicateProducts(requestedItems);

    const sale = await getSaleForReturn(payload.original_sale_id);

    if (sale.return_status === "fully_returned") {
        throw buildValidationError("This sale has already been fully returned");
    }

    const customer = await customerService.getCustomerById(sale.customer_id, { includeSystem: true });
    const productsById = await fetchProductsForReturn(requestedItems);
    const returnLineItems = buildReturnLineItems({
        sale,
        returnItems: requestedItems,
        productsById,
    });
    const totals = buildReturnTotals(returnLineItems);
    const updatedSaleState = buildUpdatedSaleState(sale, returnLineItems);
    const now = new Date();
    const returnNumber = await generateReturnNumber(customer, now);

    const returnDocument = {
        return_number: returnNumber,
        original_sale_id: sale._id,
        original_invoice_number: sale.invoice_number,
        customer_id: sale.customer_id,
        customer_snapshot: sale.customer_snapshot,
        items: returnLineItems,
        subtotal_after_company_discount_refunded: totals.subtotal_after_company_discount_refunded,
        total_amount_refunded: totals.total_amount_refunded,
        total_dealer_discount_refunded: totals.total_dealer_discount_refunded,
        total_company_discount_refunded: totals.total_company_discount_refunded,
        total_company_commission_refunded: totals.total_company_commission_refunded,
        profit_loss_refunded: totals.profit_loss_refunded,
        total_quantity_pieces_refunded: totals.total_quantity_pieces_refunded,
        return_type: updatedSaleState.return_status === "fully_returned" ? "full" : "partial",
        created_at: now,
        updated_at: now,
    };

    const client = getClient();
    const session = client.startSession();

    try {
        session.startTransaction();
        await restoreStocks(returnLineItems, session);
        const insertResult = await getReturnsCollection().insertOne(returnDocument, { session });
        await getSalesCollection().updateOne(
            { _id: sale._id },
            {
                $set: {
                    items: updatedSaleState.items,
                    return_status: updatedSaleState.return_status,
                    return_summary: updatedSaleState.return_summary,
                    updated_at: now,
                },
            },
            { session }
        );
        await session.commitTransaction();
        return getReturnById(insertResult.insertedId.toString());
    } catch (error) {
        await session.abortTransaction();
        if (!isTransactionUnsupportedError(error)) {
            throw error;
        }
    } finally {
        await session.endSession();
    }

    await restoreStocks(returnLineItems);

    let insertResult = null;
    let saleUpdated = false;

    try {
        await getSalesCollection().updateOne(
            { _id: sale._id },
            {
                $set: {
                    items: updatedSaleState.items,
                    return_status: updatedSaleState.return_status,
                    return_summary: updatedSaleState.return_summary,
                    updated_at: now,
                },
            }
        );
        saleUpdated = true;
        insertResult = await getReturnsCollection().insertOne(returnDocument);
        return getReturnById(insertResult.insertedId.toString());
    } catch (error) {
        await revertRestoredStocks(returnLineItems);

        if (saleUpdated) {
            await getSalesCollection().updateOne(
                { _id: sale._id },
                {
                    $set: {
                        items: sale.items,
                        return_status: sale.return_status,
                        return_summary: sale.return_summary,
                        updated_at: sale.updated_at || sale.created_at,
                    },
                }
            );
        }

        if (insertResult?.insertedId) {
            await getReturnsCollection().deleteOne({ _id: insertResult.insertedId });
        }

        throw error;
    }
}

async function listReturns(filters = {}) {
    const query = {};
    const dateFilter = buildDateRangeFilter(filters);

    if (dateFilter) {
        Object.assign(query, dateFilter);
    }

    if (filters.customer_id) {
        query.customer_id = productService.toObjectId(filters.customer_id);
    }

    if (filters.original_sale_id) {
        query.original_sale_id = productService.toObjectId(filters.original_sale_id);
    }

    return getReturnsCollection().find(query).sort({ created_at: -1 }).toArray();
}

async function getReturnById(id) {
    const returnRecord = await getReturnsCollection().findOne({ _id: productService.toObjectId(id) });

    if (!returnRecord) {
        const error = new Error("Return not found");
        error.statusCode = 404;
        throw error;
    }

    return returnRecord;
}

module.exports = {
    createReturn,
    listReturns,
    getReturnById,
};
