const { getCollection, getClient } = require("../db/mongo");
const customerService = require("./customerService");
const productService = require("./productService");
const { convertToPieces, validateUnitType } = require("../utils/unitConversion");
const { roundMoney } = require("../utils/money");
const { generateInvoiceNumber } = require("../utils/invoiceNumberService");

const PAYMENT_STATUS = {
    PAID: "paid",
    PARTIALLY_PAID: "partially_paid",
    UNPAID: "unpaid",
};

const PAYMENT_TYPE = {
    INITIAL: "initial",
    SETTLEMENT: "settlement",
};

function getSalesCollection() {
    return getCollection("sales");
}

function getSalePaymentsCollection() {
    return getCollection("sale_payments");
}

function buildValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function normalizePaymentMethod(value, fallback = "cash") {
    const method = String(value || "").trim().toLowerCase();
    return method || fallback;
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

function buildSalePaymentSummary({
    totalAmount,
    returnedAmount = 0,
    paidAmount = 0,
    lastPaymentAt = null,
}) {
    const normalizedTotalAmount = Math.max(roundMoney(totalAmount || 0), 0);
    const normalizedReturnedAmount = Math.max(roundMoney(returnedAmount || 0), 0);
    const collectibleAmount = Math.max(
        roundMoney(normalizedTotalAmount - normalizedReturnedAmount),
        0
    );
    const normalizedPaidAmount = Math.max(roundMoney(paidAmount || 0), 0);
    const dueAmount = Math.max(roundMoney(collectibleAmount - normalizedPaidAmount), 0);
    const refundDueAmount = Math.max(roundMoney(normalizedPaidAmount - collectibleAmount), 0);
    const appliedPaidAmount = roundMoney(Math.min(normalizedPaidAmount, collectibleAmount));

    let paymentStatus = PAYMENT_STATUS.PAID;

    if (dueAmount <= 0) {
        paymentStatus = PAYMENT_STATUS.PAID;
    } else if (appliedPaidAmount <= 0) {
        paymentStatus = PAYMENT_STATUS.UNPAID;
    } else {
        paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
    }

    return {
        payment_status: paymentStatus,
        collectible_amount: collectibleAmount,
        paid_amount: normalizedPaidAmount,
        applied_paid_amount: appliedPaidAmount,
        due_amount: dueAmount,
        refund_due_amount: refundDueAmount,
        last_payment_at: lastPaymentAt || null,
    };
}

function normalizeSalePaymentFields(sale) {
    if (!sale) {
        return sale;
    }

    const summary = buildSalePaymentSummary({
        totalAmount: sale.total_amount,
        returnedAmount: sale.return_summary?.returned_amount || 0,
        paidAmount:
            sale.paid_amount ??
            sale.payment_summary?.paid_amount ??
            sale.total_amount ??
            0,
        lastPaymentAt: sale.last_payment_at || sale.payment_summary?.last_payment_at || null,
    });

    return {
        ...sale,
        ...summary,
    };
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
            final_amount: roundMoney(grossAmount - companyDiscountAmount),
            profit_loss: roundMoney(grossAmount - companyDiscountAmount - purchasePrice * quantityPieces),
            returned_quantity_pieces: 0,
        };
    });
}

function finalizeLineItems(lineItems, dealerDiscountAmount) {
    const maximumAllowedDiscount = roundMoney(
        lineItems.reduce((sum, item) => sum + item.net_amount_before_dealer_discount, 0)
    );
    const cappedDealerDiscountAmount = Math.min(roundMoney(dealerDiscountAmount), maximumAllowedDiscount);

    return {
        lineItems,
        dealerDiscountAmount: cappedDealerDiscountAmount,
        subtotalAfterCompanyDiscount: maximumAllowedDiscount,
    };
}

function buildInvoiceTotals(lineItems, dealerDiscountAmount, subtotalAfterCompanyDiscount) {
    const lineProfitLoss = roundMoney(lineItems.reduce((sum, item) => sum + item.profit_loss, 0));

    return {
        subtotal_amount: roundMoney(lineItems.reduce((sum, item) => sum + item.gross_amount, 0)),
        subtotal_after_company_discount: roundMoney(subtotalAfterCompanyDiscount),
        total_amount: roundMoney(roundMoney(subtotalAfterCompanyDiscount) - roundMoney(dealerDiscountAmount)),
        total_dealer_discount: roundMoney(dealerDiscountAmount),
        total_company_discount: roundMoney(lineItems.reduce((sum, item) => sum + item.company_discount_amount, 0)),
        total_company_commission: roundMoney(lineItems.reduce((sum, item) => sum + item.company_commission_amount, 0)),
        profit_loss: roundMoney(lineProfitLoss - roundMoney(dealerDiscountAmount)),
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

function buildInitialPaymentConfig(payload, totalAmount, customer) {
    const normalizedTotalAmount = roundMoney(totalAmount || 0);
    const hasPaymentMode = payload.payment_mode !== undefined && payload.payment_mode !== null;

    if (!hasPaymentMode) {
        throw buildValidationError("Payment mode is required");
    }

    if (payload.paid_now_amount === undefined || payload.paid_now_amount === null || payload.paid_now_amount === "") {
        throw buildValidationError("Paid amount is required");
    }

    const rawPaidAmount = roundMoney(payload.paid_now_amount);
    if (!Number.isFinite(rawPaidAmount) || rawPaidAmount < 0) {
        throw buildValidationError("Paid amount must be zero or greater");
    }

    const requestedMode = String(payload.payment_mode || "").trim().toLowerCase();

    if (!["full", "partial", "unpaid"].includes(requestedMode)) {
        throw buildValidationError("Payment mode must be full, partial, or unpaid");
    }

    const paymentMode = requestedMode;

    let paidNowAmount = normalizedTotalAmount;

    if (normalizedTotalAmount <= 0) {
        if (paymentMode !== "full") {
            throw buildValidationError("Zero-amount invoices must use full payment mode");
        }

        if (rawPaidAmount !== 0) {
            throw buildValidationError("Zero-amount invoices must have zero paid amount");
        }

        paidNowAmount = 0;
    } else if (paymentMode === "unpaid") {
        if (rawPaidAmount !== 0) {
            throw buildValidationError("Unpaid invoices must have zero paid amount");
        }

        paidNowAmount = 0;
    } else if (paymentMode === "partial") {
        if (rawPaidAmount <= 0 || rawPaidAmount >= normalizedTotalAmount) {
            throw buildValidationError("Partial payment must be greater than zero and less than total amount");
        }

        paidNowAmount = rawPaidAmount;
    }

    if (paymentMode === "full") {
        if (rawPaidAmount !== normalizedTotalAmount) {
            throw buildValidationError("Fully paid invoices must match the total amount exactly");
        }

        paidNowAmount = normalizedTotalAmount;
    }

    if (paidNowAmount < normalizedTotalAmount && customer.is_system) {
        throw buildValidationError("Anonymous walk-in customer sales must be fully paid");
    }

    return {
        paymentMode,
        paidNowAmount,
        paymentMethod: normalizePaymentMethod(payload.payment_method),
        paymentNote: String(payload.payment_note || "").trim(),
    };
}

function buildPaymentRecord({
    sale,
    amount,
    paymentType,
    method,
    note = "",
    actor = null,
    createdAt,
}) {
    return {
        sale_id: sale._id,
        invoice_number: sale.invoice_number,
        customer_id: sale.customer_id,
        customer_snapshot: sale.customer_snapshot,
        amount: roundMoney(amount),
        payment_type: paymentType,
        method: normalizePaymentMethod(method),
        note: String(note || "").trim(),
        created_by: actor?.email || null,
        created_at: createdAt,
        updated_at: createdAt,
    };
}

async function getSaleByIdRaw(id) {
    const sale = await getSalesCollection().findOne({ _id: productService.toObjectId(id) });

    if (!sale) {
        const error = new Error("Sale not found");
        error.statusCode = 404;
        throw error;
    }

    return sale;
}

async function listSalePaymentsInternal(saleId) {
    return getSalePaymentsCollection()
        .find({ sale_id: productService.toObjectId(saleId) })
        .sort({ created_at: -1, _id: -1 })
        .toArray();
}

async function createSale(payload, actor = null) {
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
    const totals = buildInvoiceTotals(
        finalizedLineItems,
        finalizedSale.dealerDiscountAmount,
        finalizedSale.subtotalAfterCompanyDiscount
    );
    const paymentConfig = buildInitialPaymentConfig(payload, totals.total_amount, customer);
    const now = new Date();
    const invoiceNumber = await generateInvoiceNumber(customer, now);

    const paymentSummary = buildSalePaymentSummary({
        totalAmount: totals.total_amount,
        paidAmount: paymentConfig.paidNowAmount,
        lastPaymentAt: paymentConfig.paidNowAmount > 0 ? now : null,
    });
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
        ...paymentSummary,
        created_at: now,
        updated_at: now,
        return_status: "not_returned",
        return_summary: {
            returned_amount: 0,
            returned_quantity_pieces: 0,
            returned_company_discount: 0,
            returned_dealer_discount: 0,
            returned_company_commission: 0,
            returned_profit_loss: 0,
        },
    };

    const client = getClient();
    const session = client.startSession();

    try {
        session.startTransaction();
        await deductStocks(finalizedLineItems, session);
        const result = await getSalesCollection().insertOne(saleDocument, { session });

        if (paymentConfig.paidNowAmount > 0) {
            await getSalePaymentsCollection().insertOne(
                buildPaymentRecord({
                    sale: { ...saleDocument, _id: result.insertedId },
                    amount: paymentConfig.paidNowAmount,
                    paymentType: PAYMENT_TYPE.INITIAL,
                    method: paymentConfig.paymentMethod,
                    note: paymentConfig.paymentNote,
                    actor,
                    createdAt: now,
                }),
                { session }
            );
        }

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

    let insertedSaleId = null;

    try {
        const result = await getSalesCollection().insertOne(saleDocument);
        insertedSaleId = result.insertedId;

        if (paymentConfig.paidNowAmount > 0) {
            await getSalePaymentsCollection().insertOne(
                buildPaymentRecord({
                    sale: { ...saleDocument, _id: insertedSaleId },
                    amount: paymentConfig.paidNowAmount,
                    paymentType: PAYMENT_TYPE.INITIAL,
                    method: paymentConfig.paymentMethod,
                    note: paymentConfig.paymentNote,
                    actor,
                    createdAt: now,
                })
            );
        }

        return getSaleById(insertedSaleId.toString());
    } catch (error) {
        if (insertedSaleId) {
            await getSalesCollection().deleteOne({ _id: insertedSaleId });
            await getSalePaymentsCollection().deleteMany({ sale_id: insertedSaleId });
        }

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

    if (filters.payment_status) {
        query.payment_status = String(filters.payment_status).trim();
    }

    if (String(filters.has_due || "").trim().toLowerCase() === "true") {
        query.due_amount = { $gt: 0 };
    }

    const sales = await getSalesCollection().find(query).sort({ created_at: -1 }).toArray();
    return sales.map((sale) => normalizeSalePaymentFields(sale));
}

async function getSaleById(id) {
    const [sale, payments] = await Promise.all([getSaleByIdRaw(id), listSalePaymentsInternal(id)]);
    return {
        ...normalizeSalePaymentFields(sale),
        payments,
    };
}

async function listSalePayments(saleId) {
    await getSaleByIdRaw(saleId);
    return listSalePaymentsInternal(saleId);
}

async function recordSalePayment(saleId, payload = {}, actor = null) {
    const sale = normalizeSalePaymentFields(await getSaleByIdRaw(saleId));

    if (sale.payment_status === PAYMENT_STATUS.PAID) {
        throw buildValidationError("This invoice is already fully paid");
    }

    const amount = roundMoney(payload.amount);

    if (amount <= 0) {
        throw buildValidationError("Payment amount must be greater than zero");
    }

    if (amount > sale.due_amount) {
        throw buildValidationError("Payment amount cannot exceed the remaining due");
    }

    const now = new Date();
    const updatedSummary = buildSalePaymentSummary({
        totalAmount: sale.total_amount,
        returnedAmount: sale.return_summary?.returned_amount || 0,
        paidAmount: roundMoney((sale.paid_amount || 0) + amount),
        lastPaymentAt: now,
    });
    const paymentRecord = buildPaymentRecord({
        sale,
        amount,
        paymentType: PAYMENT_TYPE.SETTLEMENT,
        method: payload.method,
        note: payload.note,
        actor,
        createdAt: now,
    });
    const client = getClient();
    const session = client.startSession();

    try {
        session.startTransaction();
        await getSalePaymentsCollection().insertOne(paymentRecord, { session });
        await getSalesCollection().updateOne(
            { _id: sale._id },
            {
                $set: {
                    ...updatedSummary,
                    updated_at: now,
                },
            },
            { session }
        );
        await session.commitTransaction();
        return getSaleById(saleId);
    } catch (error) {
        await session.abortTransaction();
        if (!isTransactionUnsupportedError(error)) {
            throw error;
        }
    } finally {
        await session.endSession();
    }

    let insertedPaymentId = null;

    try {
        const insertResult = await getSalePaymentsCollection().insertOne(paymentRecord);
        insertedPaymentId = insertResult.insertedId;
        await getSalesCollection().updateOne(
            { _id: sale._id },
            {
                $set: {
                    ...updatedSummary,
                    updated_at: now,
                },
            }
        );
        return getSaleById(saleId);
    } catch (error) {
        if (insertedPaymentId) {
            await getSalePaymentsCollection().deleteOne({ _id: insertedPaymentId });
        }

        throw error;
    }
}

async function getCompanyDueSummary(filters = {}) {
    const matchStage = {};
    const dateFilter = buildDateRangeFilter(filters);

    if (dateFilter) {
        Object.assign(matchStage, dateFilter);
    }

    if (filters.customer_id) {
        matchStage.customer_id = productService.toObjectId(filters.customer_id);
    }

    if (filters.channel) {
        matchStage.channel = filters.channel;
    }

    const returnsCollection = getCollection("returns");

    const [summaryResult, returnSummaryResult, byProduct, recentSales] = await Promise.all([
        getSalesCollection()
            .aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        total_company_commission: { $sum: "$total_company_commission" },
                        total_sales_count: { $sum: 1 },
                        total_products_count: { $sum: { $size: "$items" } },
                        total_quantity_pieces: {
                            $sum: {
                                $sum: {
                                    $map: {
                                        input: "$items",
                                        as: "item",
                                        in: "$$item.quantity_pieces",
                                    },
                                },
                            },
                        },
                    },
                },
            ])
            .toArray(),
        returnsCollection
            .aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        total_company_commission_refunded: {
                            $sum: "$total_company_commission_refunded",
                        },
                    },
                },
            ])
            .toArray(),
        getSalesCollection()
            .aggregate([
                { $match: matchStage },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.product_id",
                        product_code: { $first: "$items.product_code" },
                        product_name: { $first: "$items.product_name" },
                        company_commission_per_piece: {
                            $first: "$items.company_commission_per_piece",
                        },
                        total_company_commission: {
                            $sum: "$items.company_commission_amount",
                        },
                        total_quantity_pieces: { $sum: "$items.quantity_pieces" },
                        total_sales_count: { $sum: 1 },
                    },
                },
                { $sort: { total_company_commission: -1, product_name: 1 } },
            ])
            .toArray(),
        getSalesCollection()
            .find(matchStage)
            .project({
                invoice_number: 1,
                created_at: 1,
                customer_snapshot: 1,
                channel: 1,
                total_company_commission: 1,
                total_amount: 1,
                payment_status: 1,
                paid_amount: 1,
                due_amount: 1,
            })
            .sort({ created_at: -1 })
            .limit(10)
            .toArray(),
    ]);

    const summary = summaryResult[0] || {
        total_company_commission: 0,
        total_sales_count: 0,
        total_products_count: 0,
        total_quantity_pieces: 0,
    };
    const returnSummary = returnSummaryResult[0] || {
        total_company_commission_refunded: 0,
    };
    const refundedByProduct = await returnsCollection
        .aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product_id",
                    total_company_commission_refunded: {
                        $sum: "$items.company_commission_amount_refunded",
                    },
                },
            },
        ])
        .toArray();
    const refundedByProductMap = new Map(
        refundedByProduct.map((item) => [
            String(item._id),
            roundMoney(item.total_company_commission_refunded || 0),
        ])
    );

    return {
        summary: {
            gross_company_commission: roundMoney(summary.total_company_commission || 0),
            refunded_company_commission: roundMoney(
                returnSummary.total_company_commission_refunded || 0
            ),
            total_company_commission: roundMoney(
                roundMoney(summary.total_company_commission || 0) -
                    roundMoney(returnSummary.total_company_commission_refunded || 0)
            ),
            total_sales_count: summary.total_sales_count || 0,
            total_products_count: summary.total_products_count || 0,
            total_quantity_pieces: summary.total_quantity_pieces || 0,
            contributing_products_count: byProduct.length,
        },
        by_product: byProduct.map((item) => {
            const refundedCompanyCommission =
                refundedByProductMap.get(String(item._id)) || 0;

            return {
                ...item,
                gross_company_commission: roundMoney(item.total_company_commission || 0),
                refunded_company_commission: refundedCompanyCommission,
                total_company_commission: roundMoney(
                    roundMoney(item.total_company_commission || 0) - refundedCompanyCommission
                ),
                company_commission_per_piece: roundMoney(item.company_commission_per_piece || 0),
            };
        }),
        recent_sales: recentSales.map((sale) => {
            const normalizedSale = normalizeSalePaymentFields(sale);

            return {
                ...normalizedSale,
                total_company_commission: roundMoney(sale.total_company_commission || 0),
                total_amount: roundMoney(sale.total_amount || 0),
            };
        }),
    };
}

module.exports = {
    PAYMENT_STATUS,
    buildSalePaymentSummary,
    normalizeSalePaymentFields,
    createSale,
    listSales,
    getSaleById,
    listSalePayments,
    recordSalePayment,
    getCompanyDueSummary,
};
