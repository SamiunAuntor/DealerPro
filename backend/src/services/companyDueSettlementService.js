const { ObjectId } = require("mongodb");
const { getCollection } = require("../db/mongo");
const { roundMoney } = require("../utils/money");

function getSettlementsCollection() {
    return getCollection("company_due_settlements");
}

function getSalesCollection() {
    return getCollection("sales");
}

function getReturnsCollection() {
    return getCollection("returns");
}

function getLatestSettlementBoundary() {
    return getSettlementsCollection().find({}).sort({ settled_at: -1, _id: -1 }).limit(1).next();
}

function buildSalesAfterSettlementMatch(settlement) {
    if (!settlement?.cutoff_created_at) {
        return {};
    }

    const cutoffCreatedAt = new Date(settlement.cutoff_created_at);
    const cutoffSaleId = settlement.cutoff_sale_id ? new ObjectId(settlement.cutoff_sale_id) : null;

    if (!cutoffSaleId) {
        return {
            created_at: { $gt: cutoffCreatedAt },
        };
    }

    return {
        $or: [
            { created_at: { $gt: cutoffCreatedAt } },
            {
                created_at: cutoffCreatedAt,
                _id: { $gt: cutoffSaleId },
            },
        ],
    };
}

function buildReturnsAfterSettlementMatch(settlement) {
    if (!settlement?.cutoff_created_at) {
        return {};
    }

    return {
        created_at: { $gt: new Date(settlement.cutoff_created_at) },
    };
}

function buildSalesUpToCutoffMatch(cutoffSale) {
    if (!cutoffSale?.created_at || !cutoffSale?._id) {
        return {};
    }

    const cutoffCreatedAt = new Date(cutoffSale.created_at);
    const cutoffSaleId = new ObjectId(cutoffSale._id);

    return {
        $or: [
            { created_at: { $lt: cutoffCreatedAt } },
            {
                created_at: cutoffCreatedAt,
                _id: { $lte: cutoffSaleId },
            },
        ],
    };
}

function buildReturnsUpToCutoffMatch(cutoffSale) {
    if (!cutoffSale?.created_at) {
        return {};
    }

    return {
        created_at: { $lte: new Date(cutoffSale.created_at) },
    };
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

function mergeMatch(baseMatch, extraMatch) {
    if (!baseMatch || Object.keys(baseMatch).length === 0) {
        return extraMatch || {};
    }

    if (!extraMatch || Object.keys(extraMatch).length === 0) {
        return baseMatch;
    }

    return { $and: [baseMatch, extraMatch] };
}

async function listSettlements() {
    return getSettlementsCollection().find({}).sort({ settled_at: -1, _id: -1 }).toArray();
}

async function getSettlementById(id) {
    if (!ObjectId.isValid(id)) {
        const error = new Error("Invalid settlement ID");
        error.statusCode = 400;
        throw error;
    }

    const settlement = await getSettlementsCollection().findOne({ _id: new ObjectId(id) });

    if (!settlement) {
        const error = new Error("Settlement not found");
        error.statusCode = 404;
        throw error;
    }

    return settlement;
}

async function listSettlementOptions() {
    const latestSettlement = await getLatestSettlementBoundary();
    const unsettledSalesMatch = buildSalesAfterSettlementMatch(latestSettlement);

    return getSalesCollection()
        .find(unsettledSalesMatch)
        .project({
            invoice_number: 1,
            created_at: 1,
            customer_snapshot: 1,
            total_company_commission: 1,
            total_amount: 1,
        })
        .sort({ created_at: -1, _id: -1 })
        .limit(200)
        .toArray();
}

async function createSettlement({ note = "", cutoff_sale_id } = {}) {
    const latestSettlement = await getLatestSettlementBoundary();
    const unsettledSalesMatch = buildSalesAfterSettlementMatch(latestSettlement);
    const unsettledReturnsMatch = buildReturnsAfterSettlementMatch(latestSettlement);
    const settlementOptions = await listSettlementOptions();
    const selectedCutoffSale =
        settlementOptions.find((sale) => String(sale._id) === String(cutoff_sale_id || "")) ||
        settlementOptions[0];

    if (!selectedCutoffSale) {
        const error = new Error("No outstanding company due is available to settle");
        error.statusCode = 400;
        throw error;
    }

    const salesToSettleMatch = mergeMatch(
        unsettledSalesMatch,
        buildSalesUpToCutoffMatch(selectedCutoffSale)
    );
    const returnsToSettleMatch = mergeMatch(
        unsettledReturnsMatch,
        buildReturnsUpToCutoffMatch(selectedCutoffSale)
    );

    const [salesSummaryResult, returnsSummaryResult] = await Promise.all([
        getSalesCollection()
            .aggregate([
                { $match: salesToSettleMatch },
                {
                    $group: {
                        _id: null,
                        gross_company_commission: { $sum: "$total_company_commission" },
                        sales_count: { $sum: 1 },
                    },
                },
            ])
            .toArray(),
        getReturnsCollection()
            .aggregate([
                { $match: returnsToSettleMatch },
                {
                    $group: {
                        _id: null,
                        refunded_company_commission: {
                            $sum: "$total_company_commission_refunded",
                        },
                        returns_count: { $sum: 1 },
                    },
                },
            ])
            .toArray(),
    ]);

    const salesSummary = salesSummaryResult[0] || {
        gross_company_commission: 0,
        sales_count: 0,
    };
    const returnsSummary = returnsSummaryResult[0] || {
        refunded_company_commission: 0,
        returns_count: 0,
    };
    const netSettledAmount = roundMoney(
        roundMoney(salesSummary.gross_company_commission || 0) -
            roundMoney(returnsSummary.refunded_company_commission || 0)
    );

    if (netSettledAmount <= 0) {
        const error = new Error("No outstanding company due is available to settle");
        error.statusCode = 400;
        throw error;
    }

    const settledAt = new Date();
    const settlementDocument = {
        settled_at: settledAt,
        cutoff_sale_id: selectedCutoffSale._id,
        cutoff_invoice_number: selectedCutoffSale.invoice_number,
        cutoff_created_at: selectedCutoffSale.created_at,
        gross_company_commission: roundMoney(salesSummary.gross_company_commission || 0),
        refunded_company_commission: roundMoney(
            returnsSummary.refunded_company_commission || 0
        ),
        net_settled_amount: netSettledAmount,
        sales_count: salesSummary.sales_count || 0,
        returns_count: returnsSummary.returns_count || 0,
        note: String(note || "").trim(),
        created_at: settledAt,
        updated_at: settledAt,
    };

    const result = await getSettlementsCollection().insertOne(settlementDocument);
    return getSettlementsCollection().findOne({ _id: result.insertedId });
}

async function getOutstandingCompanyDueSummary(filters = {}) {
    const latestSettlement = await getLatestSettlementBoundary();
    const settlementSalesMatch = buildSalesAfterSettlementMatch(latestSettlement);
    const settlementReturnsMatch = buildReturnsAfterSettlementMatch(latestSettlement);
    const dateFilter = buildDateRangeFilter(filters);

    const filterMatch = {};

    if (filters.customer_id) {
        filterMatch.customer_id = new ObjectId(filters.customer_id);
    }

    if (filters.channel) {
        filterMatch.channel = filters.channel;
    }

    const salesMatch = mergeMatch(settlementSalesMatch, mergeMatch(dateFilter || {}, filterMatch));
    const returnsMatch = mergeMatch(settlementReturnsMatch, mergeMatch(dateFilter || {}, filterMatch));

    const [summaryResult, returnSummaryResult, byProduct, recentSales, settlements, settlementOptions] = await Promise.all([
        getSalesCollection()
            .aggregate([
                { $match: salesMatch },
                {
                    $group: {
                        _id: null,
                        total_company_commission: { $sum: "$total_company_commission" },
                        total_sales_count: { $sum: 1 },
                        total_products_count: { $sum: { $size: "$items" } },
                    },
                },
            ])
            .toArray(),
        getReturnsCollection()
            .aggregate([
                { $match: returnsMatch },
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
                { $match: salesMatch },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.product_id",
                        product_code: { $first: "$items.product_code" },
                        product_name: { $first: "$items.product_name" },
                        company_commission_per_piece: {
                            $first: "$items.company_commission_per_piece",
                        },
                        gross_company_commission: {
                            $sum: "$items.company_commission_amount",
                        },
                        total_quantity_pieces: { $sum: "$items.quantity_pieces" },
                        total_sales_count: { $sum: 1 },
                    },
                },
                { $sort: { gross_company_commission: -1, product_name: 1 } },
            ])
            .toArray(),
        getSalesCollection()
            .find(salesMatch)
            .project({
                invoice_number: 1,
                created_at: 1,
                customer_snapshot: 1,
                channel: 1,
                total_company_commission: 1,
                total_amount: 1,
            })
            .sort({ created_at: -1, _id: -1 })
            .limit(10)
            .toArray(),
        listSettlements(),
        !filters.customer_id && !filters.channel && !filters.from && !filters.to
            ? listSettlementOptions()
            : Promise.resolve([]),
    ]);

    const refundedByProduct = await getReturnsCollection()
        .aggregate([
            { $match: returnsMatch },
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

    const summary = summaryResult[0] || {
        total_company_commission: 0,
        total_sales_count: 0,
        total_products_count: 0,
    };
    const returnSummary = returnSummaryResult[0] || {
        total_company_commission_refunded: 0,
    };
    const latestRecordedSettlement = settlements[0] || null;

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
            contributing_products_count: byProduct.length,
            last_settlement: latestRecordedSettlement
                ? {
                      settled_at: latestRecordedSettlement.settled_at,
                      cutoff_invoice_number: latestRecordedSettlement.cutoff_invoice_number,
                      net_settled_amount: roundMoney(
                          latestRecordedSettlement.net_settled_amount || 0
                      ),
                  }
                : null,
        },
        by_product: byProduct.map((item) => {
            const refundedCompanyCommission =
                refundedByProductMap.get(String(item._id)) || 0;

            return {
                ...item,
                refunded_company_commission: refundedCompanyCommission,
                total_company_commission: roundMoney(
                    roundMoney(item.gross_company_commission || 0) - refundedCompanyCommission
                ),
                company_commission_per_piece: roundMoney(item.company_commission_per_piece || 0),
                gross_company_commission: roundMoney(item.gross_company_commission || 0),
            };
        }),
        recent_sales: recentSales.map((sale) => ({
            ...sale,
            total_company_commission: roundMoney(sale.total_company_commission || 0),
            total_amount: roundMoney(sale.total_amount || 0),
        })),
        settlement_options: settlementOptions.map((sale) => ({
            ...sale,
            total_company_commission: roundMoney(sale.total_company_commission || 0),
            total_amount: roundMoney(sale.total_amount || 0),
        })),
        settlements: settlements.map((settlement) => ({
            ...settlement,
            gross_company_commission: roundMoney(settlement.gross_company_commission || 0),
            refunded_company_commission: roundMoney(
                settlement.refunded_company_commission || 0
            ),
            net_settled_amount: roundMoney(settlement.net_settled_amount || 0),
        })),
    };
}

async function getSettlementReport(id) {
    const settlement = await getSettlementById(id);
    const previousSettlement = await getSettlementsCollection()
        .find({
            settled_at: { $lt: settlement.settled_at },
        })
        .sort({ settled_at: -1, _id: -1 })
        .limit(1)
        .next();

    const salesMatch = mergeMatch(
        buildSalesAfterSettlementMatch(previousSettlement),
        buildSalesUpToCutoffMatch(settlement)
    );
    const returnsMatch = mergeMatch(
        buildReturnsAfterSettlementMatch(previousSettlement),
        buildReturnsUpToCutoffMatch(settlement)
    );

    const [byProduct, includedSales, includedReturns, refundedByProduct] = await Promise.all([
        getSalesCollection()
            .aggregate([
                { $match: salesMatch },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.product_id",
                        product_code: { $first: "$items.product_code" },
                        product_name: { $first: "$items.product_name" },
                        company_commission_per_piece: {
                            $first: "$items.company_commission_per_piece",
                        },
                        gross_company_commission: {
                            $sum: "$items.company_commission_amount",
                        },
                        total_quantity_pieces: { $sum: "$items.quantity_pieces" },
                        total_sales_count: { $sum: 1 },
                    },
                },
                { $sort: { gross_company_commission: -1, product_name: 1 } },
            ])
            .toArray(),
        getSalesCollection()
            .find(salesMatch)
            .project({
                invoice_number: 1,
                created_at: 1,
                customer_snapshot: 1,
                channel: 1,
                total_company_commission: 1,
                total_amount: 1,
            })
            .sort({ created_at: 1, _id: 1 })
            .toArray(),
        getReturnsCollection()
            .find(returnsMatch)
            .project({
                return_number: 1,
                created_at: 1,
                original_invoice_number: 1,
                total_company_commission_refunded: 1,
                total_amount_refunded: 1,
            })
            .sort({ created_at: 1, _id: 1 })
            .toArray(),
        getReturnsCollection()
            .aggregate([
                { $match: returnsMatch },
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
            .toArray(),
    ]);

    const refundedByProductMap = new Map(
        refundedByProduct.map((item) => [
            String(item._id),
            roundMoney(item.total_company_commission_refunded || 0),
        ])
    );

    return {
        settlement: {
            ...settlement,
            gross_company_commission: roundMoney(settlement.gross_company_commission || 0),
            refunded_company_commission: roundMoney(settlement.refunded_company_commission || 0),
            net_settled_amount: roundMoney(settlement.net_settled_amount || 0),
        },
        by_product: byProduct.map((item) => {
            const refundedCompanyCommission =
                refundedByProductMap.get(String(item._id)) || 0;

            return {
                ...item,
                gross_company_commission: roundMoney(item.gross_company_commission || 0),
                refunded_company_commission: refundedCompanyCommission,
                total_company_commission: roundMoney(
                    roundMoney(item.gross_company_commission || 0) - refundedCompanyCommission
                ),
                company_commission_per_piece: roundMoney(item.company_commission_per_piece || 0),
            };
        }),
        included_sales: includedSales.map((sale) => ({
            ...sale,
            total_company_commission: roundMoney(sale.total_company_commission || 0),
            total_amount: roundMoney(sale.total_amount || 0),
        })),
        included_returns: includedReturns.map((returnRecord) => ({
            ...returnRecord,
            total_company_commission_refunded: roundMoney(
                returnRecord.total_company_commission_refunded || 0
            ),
            total_amount_refunded: roundMoney(returnRecord.total_amount_refunded || 0),
        })),
    };
}

module.exports = {
    listSettlements,
    listSettlementOptions,
    createSettlement,
    getOutstandingCompanyDueSummary,
    getSettlementReport,
};
