const { getCollection } = require("../db/mongo");
const { roundMoney } = require("../utils/money");

function buildValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function getRangeConfig(range) {
    const now = new Date();
    const endDate = new Date(now);

    if (!range || range === "all") {
        return {
            key: "all",
            label: "All Time",
            startDate: null,
            endDate,
            bucketFormat: "%Y-%m",
        };
    }

    if (range === "today") {
        const startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        return {
            key: "today",
            label: "Today",
            startDate,
            endDate,
            bucketFormat: "%Y-%m-%d",
        };
    }

    if (range === "7d" || range === "30d") {
        const days = range === "7d" ? 7 : 30;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        return {
            key: range,
            label: range === "7d" ? "Last 7 Days" : "Last 30 Days",
            startDate,
            endDate,
            bucketFormat: "%Y-%m-%d",
        };
    }

    throw buildValidationError("Invalid dashboard range");
}

function buildDateMatch(rangeConfig) {
    if (!rangeConfig.startDate) {
        return {};
    }

    return {
        created_at: {
            $gte: rangeConfig.startDate,
            $lte: rangeConfig.endDate,
        },
    };
}

function normalizeGroupRows(rows, valueKey) {
    return rows.map((row) => ({
        label: row._id,
        value: roundMoney(row[valueKey] || 0),
    }));
}

async function getDashboardOverview(range = "30d") {
    const rangeConfig = getRangeConfig(range);
    const salesCollection = getCollection("sales");
    const returnsCollection = getCollection("returns");
    const productsCollection = getCollection("products");
    const customersCollection = getCollection("customers");
    const dateMatch = buildDateMatch(rangeConfig);

    const [
        salesSummaryResult,
        returnsSummaryResult,
        customerCount,
        productSnapshotResult,
        lowStockCountResult,
        outOfStockCount,
        salesTrendRows,
        returnsTrendRows,
        topProductsRows,
        topCustomersRows,
        recentSales,
        recentReturns,
    ] = await Promise.all([
        salesCollection
            .aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: null,
                        gross_sales_amount: { $sum: "$total_amount" },
                        sales_count: { $sum: 1 },
                        net_profit_loss: { $sum: "$profit_loss" },
                        gross_company_due: { $sum: "$total_company_commission" },
                    },
                },
            ])
            .toArray(),
        returnsCollection
            .aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: null,
                        total_returns_amount: { $sum: "$total_amount_refunded" },
                        returns_count: { $sum: 1 },
                        returned_profit_loss: { $sum: "$profit_loss_refunded" },
                        refunded_company_due: { $sum: "$total_company_commission_refunded" },
                    },
                },
            ])
            .toArray(),
        customersCollection.countDocuments({ is_system: { $ne: true } }),
        productsCollection
            .aggregate([
                {
                    $group: {
                        _id: null,
                        total_products: { $sum: 1 },
                        inventory_valuation: {
                            $sum: {
                                $multiply: [
                                    { $ifNull: ["$current_stock_pieces", 0] },
                                    { $ifNull: ["$purchase_price", 0] },
                                ],
                            },
                        },
                    },
                },
            ])
            .toArray(),
        productsCollection
            .aggregate([
                {
                    $addFields: {
                        effective_low_stock_threshold: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$low_stock_threshold", null] },
                                        { $gte: ["$low_stock_threshold", 0] },
                                    ],
                                },
                                "$low_stock_threshold",
                                20,
                            ],
                        },
                    },
                },
                {
                    $match: {
                        current_stock_pieces: { $gt: 0 },
                        $expr: { $lte: ["$current_stock_pieces", "$effective_low_stock_threshold"] },
                    },
                },
                { $count: "count" },
            ])
            .toArray(),
        productsCollection.countDocuments({ current_stock_pieces: { $lte: 0 } }),
        salesCollection
            .aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: rangeConfig.bucketFormat,
                                date: "$created_at",
                            },
                        },
                        sales_amount: { $sum: "$total_amount" },
                    },
                },
                { $sort: { _id: 1 } },
            ])
            .toArray(),
        returnsCollection
            .aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: rangeConfig.bucketFormat,
                                date: "$created_at",
                            },
                        },
                        returns_amount: { $sum: "$total_amount_refunded" },
                    },
                },
                { $sort: { _id: 1 } },
            ])
            .toArray(),
        salesCollection
            .aggregate([
                { $match: dateMatch },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.product_name",
                        sales_amount: { $sum: "$items.final_amount" },
                    },
                },
                { $sort: { sales_amount: -1 } },
                { $limit: 5 },
            ])
            .toArray(),
        salesCollection
            .aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: "$customer_snapshot.name",
                        sales_amount: { $sum: "$total_amount" },
                    },
                },
                { $sort: { sales_amount: -1 } },
                { $limit: 5 },
            ])
            .toArray(),
        salesCollection
            .find(dateMatch)
            .project({
                invoice_number: 1,
                customer_snapshot: 1,
                total_amount: 1,
                created_at: 1,
            })
            .sort({ created_at: -1 })
            .limit(6)
            .toArray(),
        returnsCollection
            .find(dateMatch)
            .project({
                return_number: 1,
                original_invoice_number: 1,
                customer_snapshot: 1,
                total_amount_refunded: 1,
                created_at: 1,
            })
            .sort({ created_at: -1 })
            .limit(6)
            .toArray(),
    ]);

    const salesSummary = salesSummaryResult[0] || {
        gross_sales_amount: 0,
        sales_count: 0,
        net_profit_loss: 0,
        gross_company_due: 0,
    };
    const returnsSummary = returnsSummaryResult[0] || {
        total_returns_amount: 0,
        returns_count: 0,
        returned_profit_loss: 0,
        refunded_company_due: 0,
    };
    const productSnapshot = productSnapshotResult[0] || {
        total_products: 0,
        inventory_valuation: 0,
    };
    const lowStockCount = lowStockCountResult[0]?.count || 0;

    const salesTrendMap = new Map(
        salesTrendRows.map((row) => [row._id, roundMoney(row.sales_amount || 0)])
    );
    const returnsTrendMap = new Map(
        returnsTrendRows.map((row) => [row._id, roundMoney(row.returns_amount || 0)])
    );
    const trendLabels = [...new Set([...salesTrendMap.keys(), ...returnsTrendMap.keys()])].sort();
    const salesVsReturnsTrend = trendLabels.map((label) => ({
        label,
        sales: salesTrendMap.get(label) || 0,
        returns: returnsTrendMap.get(label) || 0,
        net: roundMoney((salesTrendMap.get(label) || 0) - (returnsTrendMap.get(label) || 0)),
    }));

    return {
        range: {
            key: rangeConfig.key,
            label: rangeConfig.label,
        },
        current_snapshot: {
            inventory_valuation: roundMoney(productSnapshot.inventory_valuation || 0),
            total_products: productSnapshot.total_products || 0,
            customer_count: customerCount,
            low_stock_count: lowStockCount,
            out_of_stock_count: outOfStockCount,
        },
        summary: {
            gross_sales_amount: roundMoney(salesSummary.gross_sales_amount || 0),
            total_returns_amount: roundMoney(returnsSummary.total_returns_amount || 0),
            net_sales_amount: roundMoney(
                roundMoney(salesSummary.gross_sales_amount || 0) -
                    roundMoney(returnsSummary.total_returns_amount || 0)
            ),
            net_profit_loss: roundMoney(
                roundMoney(salesSummary.net_profit_loss || 0) -
                    roundMoney(returnsSummary.returned_profit_loss || 0)
            ),
            net_company_due: roundMoney(
                roundMoney(salesSummary.gross_company_due || 0) -
                    roundMoney(returnsSummary.refunded_company_due || 0)
            ),
            sales_count: salesSummary.sales_count || 0,
            returns_count: returnsSummary.returns_count || 0,
        },
        charts: {
            sales_vs_returns_trend: salesVsReturnsTrend,
            top_products: normalizeGroupRows(topProductsRows, "sales_amount"),
            top_customers: normalizeGroupRows(topCustomersRows, "sales_amount"),
        },
        tables: {
            recent_sales: recentSales.map((sale) => ({
                ...sale,
                total_amount: roundMoney(sale.total_amount || 0),
            })),
            recent_returns: recentReturns.map((returnRecord) => ({
                ...returnRecord,
                total_amount_refunded: roundMoney(returnRecord.total_amount_refunded || 0),
            })),
        },
    };
}

module.exports = {
    getDashboardOverview,
};
