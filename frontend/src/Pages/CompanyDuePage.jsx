import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxios from "../Hooks/UseAxios";
import { formatCurrency } from "../utils/unitConversion";

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function CompanyDuePage() {
    const axios = useAxios();
    const [filters, setFilters] = useState({
        customer_id: "",
        channel: "",
        from: "",
        to: "",
    });

    const customersQuery = useQuery({
        queryKey: ["customers", "company-due-options"],
        queryFn: async () => {
            const [customersResponse, walkInResponse] = await Promise.all([
                axios.get("/customers"),
                axios.get("/customers/walk-in"),
            ]);

            return {
                customers: customersResponse.data,
                walkInCustomer: walkInResponse.data,
            };
        },
    });

    const companyDueQuery = useQuery({
        queryKey: ["sales", "company-due", filters],
        queryFn: async () => {
            const response = await axios.get("/sales/company-due", { params: filters });
            return response.data;
        },
    });

    const customerOptions = [
        ...(customersQuery.data?.walkInCustomer ? [customersQuery.data.walkInCustomer] : []),
        ...(customersQuery.data?.customers || []),
    ];

    const summary = companyDueQuery.data?.summary || {
        gross_company_commission: 0,
        refunded_company_commission: 0,
        total_company_commission: 0,
        total_sales_count: 0,
        total_products_count: 0,
        total_quantity_pieces: 0,
        contributing_products_count: 0,
    };

    const productRows = companyDueQuery.data?.by_product || [];
    const recentSales = companyDueQuery.data?.recent_sales || [];

    return (
        <div className="flex h-full w-full flex-col gap-4 bg-white p-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">
                            Company Due
                        </h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Claimable commission extracted from stored sales
                        </p>
                    </div>

                    <div className="grid w-full gap-2 md:w-auto md:grid-cols-4">
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, from: event.target.value }))
                            }
                            type="date"
                            value={filters.from}
                        />
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, to: event.target.value }))
                            }
                            type="date"
                            value={filters.to}
                        />
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, channel: event.target.value }))
                            }
                            value={filters.channel}
                        >
                            <option value="">All channels</option>
                            <option value="pos">POS</option>
                            <option value="customer">Customer</option>
                        </select>
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, customer_id: event.target.value }))
                            }
                            value={filters.customer_id}
                        >
                            <option value="">All customers</option>
                            {customerOptions.map((customer) => (
                                <option key={customer._id} value={customer._id}>
                                    {customer.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Total Claimable
                        </p>
                        <p className="mt-2 text-2xl font-black text-gray-900">
                            {formatCurrency(summary.total_company_commission)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Gross Commission
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {formatCurrency(summary.gross_company_commission)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Refunded Commission
                        </p>
                        <p className="mt-2 text-xl font-semibold text-red-600">
                            {formatCurrency(summary.refunded_company_commission)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Sales Count
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {summary.total_sales_count}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Product Lines
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {summary.total_products_count}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Pieces Sold
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {summary.total_quantity_pieces}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Products Due
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {summary.contributing_products_count}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                    <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                        Commission Breakdown
                    </h2>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-[920px] w-full table-fixed border-collapse text-left">
                        <thead className="border-b border-gray-200 bg-gray-100">
                            <tr className="divide-x divide-gray-200">
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Product
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Code
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Comm./Piece
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Pieces
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Sales Lines
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Refunded
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Claimable
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {companyDueQuery.isLoading && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={7}>
                                        Loading company due summary...
                                    </td>
                                </tr>
                            )}
                            {!companyDueQuery.isLoading && productRows.length === 0 && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={7}>
                                        No claimable company commission found for the selected filters.
                                    </td>
                                </tr>
                            )}
                            {productRows.map((row) => (
                                <tr key={String(row._id)} className="divide-x divide-gray-200">
                                    <td className="px-3 py-2 text-sm font-semibold text-gray-800">
                                        {row.product_name}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                        {row.product_code}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                        {formatCurrency(row.company_commission_per_piece)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                        {row.total_quantity_pieces}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                        {row.total_sales_count}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm font-semibold text-red-600">
                                        {formatCurrency(row.refunded_company_commission)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                                        {formatCurrency(row.total_company_commission)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                    <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                        Recent Contributing Sales
                    </h2>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-[920px] w-full table-fixed border-collapse text-left">
                        <thead className="border-b border-gray-200 bg-gray-100">
                            <tr className="divide-x divide-gray-200">
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Invoice
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Customer
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Channel
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Sale Amount
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Commission
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {companyDueQuery.isLoading && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={6}>
                                        Loading recent sales...
                                    </td>
                                </tr>
                            )}
                            {!companyDueQuery.isLoading && recentSales.length === 0 && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={6}>
                                        No sales found for the selected filters.
                                    </td>
                                </tr>
                            )}
                            {recentSales.map((sale) => (
                                <tr key={sale._id} className="divide-x divide-gray-200">
                                    <td className="px-3 py-2 text-center text-xs font-semibold text-gray-800">
                                        {sale.invoice_number}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-700">
                                        {sale.customer_snapshot?.name}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm capitalize text-gray-700">
                                        {sale.channel}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">
                                        {formatCurrency(sale.total_amount)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                                        {formatCurrency(sale.total_company_commission)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                        {formatDateTime(sale.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default CompanyDuePage;
