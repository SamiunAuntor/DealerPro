const { getCollection, getClient } = require("../db/mongo");
const customerService = require("./customerService");
const productService = require("./productService");
const { convertToPieces, validateUnitType } = require("../utils/unitConversion");
const { allocateAmountProportionally, roundMoney } = require("../utils/money");
const { generateInvoiceNumber } = require("../utils/invoiceNumberService");

function getSalesCollection() {
    return getCollection("sales");
}

function buildValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function assertNoDuplicateProducts(items) {
    const seenProductIds = new Set();

    for (const item of items) {
        const productId = String(item.product_id || "");

        if (seenProductIds.has(productId)) {
            throw buildValidationError("The same product cannot be added twice in one sale");
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

function buildLineItems(productsById, requestedItems) {
    return requestedItems.map((requestedItem) => {
        const product = productsById.get(String(requestedItem.product_id));

        if (!product) {
            throw buildValidationError("One or more selected products were not found");
        }

        const unitType = validateUnitType(requestedItem.unit_type || product.unit_type);
        const quantity = Number(requestedItem.quantity);
        const quantityPieces = convertToPieces({ quantity, unitType, product });
        const salePrice = roundMoney(product.selling_price);
        const purchasePrice = roundMoney(product.purchase_price);
        const grossAmount = roundMoney(salePrice * quantityPieces);
        const companyDiscountRate = Number(product.company_discount) || 0;
        const companyDiscountAmount = roundMoney((grossAmount * companyDiscountRate) / 100);
        const companyCommissionPerPiece = roundMoney(product.company_commission);
        const companyCommissionAmount = roundMoney(companyCommissionPerPiece * quantityPieces);

        return {
            product_id: product._id,
            product_code: product.code,
            product_reference_id: product.product_id,
            product_name: product.name,
            quantity,
            unit_type: unitType,
            quantity_pieces: quantityPieces,
            purchase_price: purchasePrice,
            sale_price: salePrice,
            gross_amount: grossAmount,
            company_discount_rate: companyDiscountRate,
            company_discount_amount: companyDiscountAmount,
            company_commission_per_piece: companyCommissionPerPiece,
            company_commission_amount: companyCommissionAmount,
            net_amount_before_dealer_discount: roundMoney(grossAmount - companyDiscountAmount),
            allocated_dealer_discount_amount: 0,
            final_amount: 0,
            profit_loss: 0,
            returned_quantity_pieces: 0,
        };
    });
}

function finalizeLineItems(lineItems, dealerDiscountAmount) {
    const maximumAllowedDiscount = roundMoney(
        lineItems.reduce((sum, item) => sum + item.net_amount_before_dealer_discount, 0)
    );
    const cappedDealerDiscountAmount = Math.min(roundMoney(dealerDiscountAmount), maximumAllowedDiscount);

    const allocations = allocateAmountProportionally(
        lineItems.map((item) => ({ baseAmount: item.net_amount_before_dealer_discount })),
        cappedDealerDiscountAmount
    );

    const finalizedLineItems = lineItems.map((item, index) => {
        const allocatedDealerDiscountAmount = roundMoney(allocations[index]);
        const finalAmount = roundMoney(item.net_amount_before_dealer_discount - allocatedDealerDiscountAmount);
        const costAmount = roundMoney(item.purchase_price * item.quantity_pieces);

        return {
            ...item,
            allocated_dealer_discount_amount: allocatedDealerDiscountAmount,
            final_amount: finalAmount,
            profit_loss: roundMoney(finalAmount - costAmount),
        };
    });

    return {
        lineItems: finalizedLineItems,
        dealerDiscountAmount: cappedDealerDiscountAmount,
    };
}

function buildInvoiceTotals(lineItems, dealerDiscountAmount) {
    return {
        subtotal_amount: roundMoney(lineItems.reduce((sum, item) => sum + item.gross_amount, 0)),
        total_amount: roundMoney(lineItems.reduce((sum, item) => sum + item.final_amount, 0)),
        total_dealer_discount: roundMoney(dealerDiscountAmount),
        total_company_discount: roundMoney(lineItems.reduce((sum, item) => sum + item.company_discount_amount, 0)),
        total_company_commission: roundMoney(lineItems.reduce((sum, item) => sum + item.company_commission_amount, 0)),
        profit_loss: roundMoney(lineItems.reduce((sum, item) => sum + item.profit_loss, 0)),
    };
}

async function fetchProductsForSale(items) {
    const uniqueProductIds = [...new Set(items.map((item) => item.product_id))];
    const products = await Promise.all(uniqueProductIds.map((id) => productService.getProductById(id)));
    return new Map(products.map((product) => [String(product._id), product]));
}

async function deductStocks(lineItems, session) {
    const productsCollection = getCollection("products");

    for (const item of lineItems) {
        const result = await productsCollection.updateOne(
            {
                _id: item.product_id,
                current_stock_pieces: { $gte: item.quantity_pieces },
            },
            {
                $inc: { current_stock_pieces: -item.quantity_pieces },
                $set: { lastUpdatedAt: new Date() },
            },
            session ? { session } : undefined
        );

        if (result.matchedCount === 0 || result.modifiedCount === 0) {
            throw buildValidationError(`Insufficient stock for ${item.product_name}`);
        }
    }
}

async function restoreStocks(lineItems) {
    const productsCollection = getCollection("products");

    await Promise.all(
        lineItems.map((item) =>
            productsCollection.updateOne(
                { _id: item.product_id },
                {
                    $inc: { current_stock_pieces: item.quantity_pieces },
                    $set: { lastUpdatedAt: new Date() },
                }
            )
        )
    );
}

function isTransactionUnsupportedError(error) {
    const message = String(error?.message || "");
    return message.includes("Transaction numbers are only allowed") || message.includes("replica set member");
}

async function createSale(payload) {
    const requestedItems = Array.isArray(payload.items) ? payload.items : [];
    const dealerDiscountAmount = roundMoney(payload.dealer_discount_amount);

    if (!payload.customer_id) {
        throw buildValidationError("Customer is required");
    }

    if (requestedItems.length === 0) {
        throw buildValidationError("At least one product must be selected");
    }

    assertNoDuplicateProducts(requestedItems);

    const customer = await customerService.getCustomerById(payload.customer_id, { includeSystem: true });
    const productsById = await fetchProductsForSale(requestedItems);
    const lineItems = buildLineItems(productsById, requestedItems);
    const finalizedSale = finalizeLineItems(lineItems, dealerDiscountAmount);
    const finalizedLineItems = finalizedSale.lineItems;
    const totals = buildInvoiceTotals(finalizedLineItems, finalizedSale.dealerDiscountAmount);
    const now = new Date();
    const invoiceNumber = await generateInvoiceNumber(customer, now);

    const saleDocument = {
        invoice_number: invoiceNumber,
        customer_id: customer._id,
        customer_snapshot: {
            name: customer.name,
            phone: customer.phone,
            is_system: Boolean(customer.is_system),
        },
        channel: payload.channel === "customer" ? "customer" : "pos",
        items: finalizedLineItems,
        ...totals,
        created_at: now,
        updated_at: now,
        return_status: "not_returned",
        return_summary: {
            returned_amount: 0,
            returned_quantity_pieces: 0,
        },
    };

    const client = getClient();
    const session = client.startSession();

    try {
        session.startTransaction();
        await deductStocks(finalizedLineItems, session);
        const result = await getSalesCollection().insertOne(saleDocument, { session });
        await session.commitTransaction();
        return getSaleById(result.insertedId.toString());
    } catch (error) {
        await session.abortTransaction();
        if (!isTransactionUnsupportedError(error)) {
            throw error;
        }
    } finally {
        await session.endSession();
    }

    await deductStocks(finalizedLineItems);

    try {
        const result = await getSalesCollection().insertOne(saleDocument);
        return getSaleById(result.insertedId.toString());
    } catch (error) {
        await restoreStocks(finalizedLineItems);
        throw error;
    }
}

async function listSales(filters = {}) {
    const query = {};
    const dateFilter = buildDateRangeFilter(filters);

    if (dateFilter) {
        Object.assign(query, dateFilter);
    }

    if (filters.customer_id) {
        query.customer_id = productService.toObjectId(filters.customer_id);
    }

    if (filters.channel) {
        query.channel = filters.channel;
    }

    if (filters.invoice_number) {
        query.invoice_number = { $regex: String(filters.invoice_number).trim(), $options: "i" };
    }

    return getSalesCollection().find(query).sort({ created_at: -1 }).toArray();
}

async function getSaleById(id) {
    const sale = await getSalesCollection().findOne({ _id: productService.toObjectId(id) });

    if (!sale) {
        const error = new Error("Sale not found");
        error.statusCode = 404;
        throw error;
    }

    return sale;
}

module.exports = {
    createSale,
    listSales,
    getSaleById,
};
