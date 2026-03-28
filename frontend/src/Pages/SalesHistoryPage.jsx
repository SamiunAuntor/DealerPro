import React, { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import useAxios from "../Hooks/UseAxios";
import SaleInvoiceDetailsModal from "../Componenets/SaleInvoiceDetailsModal";
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

function SalesHistoryPage() {
    const axios = useAxios();
    const [selectedSale, setSelectedSale] = useState(null);
    const [historyFilters, setHistoryFilters] = useState({
        customer_id: "",
        channel: "",
        from: "",
        to: "",
    });

    const customersQuery = useQuery({
        queryKey: ["customers", "sales-history-options"],
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

    const salesQuery = useQuery({
        queryKey: ["sales", historyFilters],
        queryFn: async () => {
            const response = await axios.get("/sales", { params: historyFilters });
            return response.data;
        },
    });

    const customerOptions = useMemo(() => {
        const regularCustomers = customersQuery.data?.customers || [];
        const walkInCustomer = customersQuery.data?.walkInCustomer;

        return walkInCustomer ? [walkInCustomer, ...regularCustomers] : regularCustomers;
    }, [customersQuery.data]);

    return (
        <div className="flex h-full w-full flex-col gap-4 bg-white p-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">
                            Sales History
                        </h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Immutable invoices and quick lookup
                        </p>
                    </div>

                    <div className="grid w-full gap-2 md:w-auto md:grid-cols-4">
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setHistoryFilters((prev) => ({ ...prev, from: event.target.value }))
                            }
                            type="date"
                            value={historyFilters.from}
                        />
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setHistoryFilters((prev) => ({ ...prev, to: event.target.value }))
                            }
                            type="date"
                            value={historyFilters.to}
                        />
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setHistoryFilters((prev) => ({ ...prev, channel: event.target.value }))
                            }
                            value={historyFilters.channel}
                        >
                            <option value="">All channels</option>
                            <option value="pos">POS</option>
                            <option value="customer">Customer</option>
                        </select>
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setHistoryFilters((prev) => ({ ...prev, customer_id: event.target.value }))
                            }
                            value={historyFilters.customer_id}
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
                                    Amount
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Profit / Loss
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Created
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {salesQuery.isLoading && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={7}>
                                        Loading sales...
                                    </td>
                                </tr>
                            )}
                            {!salesQuery.isLoading && (salesQuery.data || []).length === 0 && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={7}>
                                        No sales found for the selected filters.
                                    </td>
                                </tr>
                            )}
                            {(salesQuery.data || []).map((sale) => (
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
                                    <td
                                        className={`px-3 py-2 text-center text-sm font-semibold ${
                                            sale.profit_loss < 0 ? "text-red-600" : "text-emerald-600"
                                        }`}
                                    >
                                        {formatCurrency(sale.profit_loss)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                        {formatDateTime(sale.created_at)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            className="p-1 text-blue-500"
                                            onClick={() => setSelectedSale(sale)}
                                            type="button"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <SaleInvoiceDetailsModal
                isOpen={Boolean(selectedSale)}
                onClose={() => setSelectedSale(null)}
                sale={selectedSale}
            />
        </div>
    );
}

export default SalesHistoryPage;
