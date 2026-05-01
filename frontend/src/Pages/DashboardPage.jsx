import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import useAxios from "../Hooks/UseAxios";
import { formatCurrency } from "../utils/unitConversion";

const RANGE_OPTIONS = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
];

const PRODUCT_COLORS = ["#111827", "#3cc720", "#16a34a", "#84cc16", "#475569"];

function DashboardPage() {
    const axios = useAxios();
    const [range, setRange] = useState("30d");

    const dashboardQuery = useQuery({
        queryKey: ["dashboard", "overview", range],
        queryFn: async () => {
            const response = await axios.get("/dashboard/overview", {
                params: { range },
            });
            return response.data;
        },
    });

    const currentSnapshot = dashboardQuery.data?.current_snapshot || {
        inventory_valuation: 0,
        opening_dealer_valuation: 0,
        left_to_company_amount: 0,
        total_products: 0,
        customer_count: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
    };

    const summary = dashboardQuery.data?.summary || {
        gross_sales_amount: 0,
        total_returns_amount: 0,
        net_sales_amount: 0,
        net_profit_loss: 0,
        net_company_due: 0,
        sales_count: 0,
        returns_count: 0,
    };

    const trendData = dashboardQuery.data?.charts?.sales_vs_returns_trend || [];
    const topProductsData = dashboardQuery.data?.charts?.top_products || [];
    const topCustomersData = dashboardQuery.data?.charts?.top_customers || [];
    return (
        <div className="flex min-h-full w-full flex-col gap-4 bg-white p-3 pb-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 pb-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-left">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
                            Business Overview
                        </h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Current stock health first, then time-based business analytics
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Inventory Valuation
                        </p>
                        <p className="mt-2 text-2xl font-black text-gray-900">
                            {formatCurrency(currentSnapshot.inventory_valuation)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Left To Company
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {formatCurrency(currentSnapshot.left_to_company_amount)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Total Products
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">{currentSnapshot.total_products}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Registered Customers
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">{currentSnapshot.customer_count}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Low Stock
                        </p>
                        <p className="mt-2 text-xl font-semibold text-amber-600">{currentSnapshot.low_stock_count}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Out Of Stock
                        </p>
                        <p className="mt-2 text-xl font-semibold text-red-600">{currentSnapshot.out_of_stock_count}</p>
                    </div>
                </div>

            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-left">
                        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">
                            Time Based Analytics
                        </h2>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            These numbers and charts change with the selected date range
                        </p>
                    </div>

                    <div className="inline-flex flex-wrap rounded-full border border-gray-200 bg-gray-50 p-1">
                        {RANGE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition ${
                                    range === option.value
                                        ? "bg-[#111827] text-[#3cc720]"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                                onClick={() => setRange(option.value)}
                                type="button"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Net Sales
                        </p>
                        <p className="mt-2 text-xl font-black leading-tight text-gray-900 break-words">
                            {formatCurrency(summary.net_sales_amount)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Gross Sales
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900 break-words">
                            {formatCurrency(summary.gross_sales_amount)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Total Returns
                        </p>
                        <p className="mt-2 text-lg font-semibold text-red-600 break-words">
                            {formatCurrency(summary.total_returns_amount)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Net Profit / Loss
                        </p>
                        <p className={`mt-2 text-lg font-semibold break-words ${summary.net_profit_loss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {formatCurrency(summary.net_profit_loss)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Net Company Due
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900 break-words">
                            {formatCurrency(summary.net_company_due)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Sales Count
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">{summary.sales_count}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Return Count
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">{summary.returns_count}</p>
                    </div>
                </div>
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-3 text-left">
                            <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                                Sales vs Returns
                            </h2>
                        </div>
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} />
                                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Line
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#3cc720"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "#3cc720", strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="returns"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-3 text-left">
                                <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                                    Top Products
                                </h2>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                        <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="label"
                                            width={110}
                                            tick={{ fill: "#334155", fontSize: 12 }}
                                        />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                            {topProductsData.map((entry, index) => (
                                                <Cell key={entry.label} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-3 text-left">
                                <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                                    Top Customers
                                </h2>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topCustomersData}>
                                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                        <XAxis dataKey="label" tick={{ fill: "#334155", fontSize: 12 }} />
                                        <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Bar dataKey="value" fill="#111827" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;
