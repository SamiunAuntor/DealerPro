import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, X } from "lucide-react";
import useAxios from "../Hooks/UseAxios";
import { formatCurrency, formatUnitLabel } from "../utils/unitConversion";

function getPaymentStatusLabel(status) {
    if (status === "partially_paid") {
        return "Partially Paid";
    }

    if (status === "unpaid") {
        return "Unpaid";
    }

    return "Paid";
}

function SaleInvoiceDetailsModal({ isOpen, sale, onClose, onReceivePayment }) {
    const axios = useAxios();
    const saleDetailsQuery = useQuery({
        queryKey: ["sales", "detail", sale?._id],
        enabled: Boolean(isOpen && sale?._id),
        queryFn: async () => {
            const response = await axios.get(`/sales/${sale._id}`);
            return response.data;
        },
    });

    if (!isOpen || !sale) {
        return null;
    }

    const detailedSale = saleDetailsQuery.data || sale;
    const hasReturns = Number(detailedSale.return_summary?.returned_quantity_pieces || 0) > 0;
    const displayCustomerName =
        detailedSale.customer_snapshot?.name === "Walk-in Customer"
            ? "Anonymous Customer"
            : detailedSale.customer_snapshot?.name;
    const displayCustomerPhone =
        detailedSale.customer_snapshot?.phone === "WALK-IN-CUSTOMER" ||
        detailedSale.customer_snapshot?.phone === "ANONYMOUS-CUSTOMER"
            ? "-"
            : detailedSale.customer_snapshot?.phone;
    const paymentHistory = detailedSale.payments || [];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 p-4">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-[#111827]">Invoice Details</h2>
                        <p className="text-xs font-semibold text-gray-500">{detailedSale.invoice_number}</p>
                    </div>
                    <button
                        className="rounded-full p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                        onClick={onClose}
                        type="button"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-5 p-6 pb-10">
                    {saleDetailsQuery.isLoading && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                            Loading latest invoice details...
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Customer</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{displayCustomerName}</p>
                            <p className="text-xs text-gray-500">{displayCustomerPhone}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Channel</p>
                            <p className="mt-2 text-sm font-semibold capitalize text-gray-800">{detailedSale.channel}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Subtotal</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{formatCurrency(detailedSale.subtotal_after_company_discount || 0)}</p>
                            <p className="text-xs text-gray-500">After company discount</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Amount</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{formatCurrency(detailedSale.total_amount)}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Dealer Discount</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{formatCurrency(detailedSale.total_dealer_discount || 0)}</p>
                            <p className="text-xs text-gray-500">
                                From subtotal {formatCurrency(detailedSale.subtotal_after_company_discount || 0)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Profit / Loss</p>
                            <p className={`mt-2 text-sm font-semibold ${detailedSale.profit_loss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                                {formatCurrency(detailedSale.profit_loss)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Payment Status</p>
                            <p className="mt-2 text-sm font-semibold text-emerald-800">
                                {getPaymentStatusLabel(detailedSale.payment_status)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Paid Amount</p>
                            <p className="mt-2 text-sm font-semibold text-emerald-800">
                                {formatCurrency(detailedSale.paid_amount || 0)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Due Amount</p>
                            <p className="mt-2 text-sm font-semibold text-amber-800">
                                {formatCurrency(detailedSale.due_amount || 0)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-sky-600">Collectible</p>
                            <p className="mt-2 text-sm font-semibold text-sky-800">
                                {formatCurrency(detailedSale.collectible_amount || 0)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">Refund Balance</p>
                            <p className="mt-2 text-sm font-semibold text-violet-800">
                                {formatCurrency(detailedSale.refund_due_amount || 0)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Last Payment</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">
                                {detailedSale.last_payment_at
                                    ? new Date(detailedSale.last_payment_at).toLocaleString("en-GB")
                                    : "-"}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Return Status</p>
                            <p className="mt-2 text-sm font-semibold capitalize text-gray-800">
                                {String(detailedSale.return_status || "not_returned").replaceAll("_", " ")}
                            </p>
                            {hasReturns && (
                                <p className="text-xs text-gray-500">
                                    Refunded {formatCurrency(detailedSale.return_summary?.returned_amount || 0)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            className="inline-flex items-center gap-2 rounded bg-[#111827] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#3cc720] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={(detailedSale.due_amount || 0) <= 0}
                            onClick={() => onReceivePayment?.(detailedSale)}
                            type="button"
                        >
                            <Banknote size={14} />
                            Receive Payment
                        </button>
                    </div>

                    {paymentHistory.length > 0 && (
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Payment History</h3>
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Initial payment and later settlements
                                </p>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-[720px] w-full table-fixed border-collapse text-left">
                                    <thead className="border-b border-gray-200 bg-gray-100">
                                        <tr className="divide-x divide-gray-200">
                                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Type</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Amount</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Method</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Note</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Recorded At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {paymentHistory.map((payment) => (
                                            <tr key={payment._id} className="divide-x divide-gray-200">
                                                <td className="px-3 py-2 text-center text-sm font-semibold capitalize text-gray-800">
                                                    {String(payment.payment_type || "-").replaceAll("_", " ")}
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm font-semibold text-emerald-700">
                                                    {formatCurrency(payment.amount || 0)}
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm capitalize text-gray-700">
                                                    {payment.method || "-"}
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm text-gray-600">
                                                    {payment.note || "-"}
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm text-gray-600">
                                                    {payment.created_at
                                                        ? new Date(payment.created_at).toLocaleString("en-GB")
                                                        : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {hasReturns && (
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Return Summary</h3>
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Only shown when a return has happened for this sale
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Amount</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(detailedSale.return_summary?.returned_amount || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Pieces</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {detailedSale.return_summary?.returned_quantity_pieces || 0}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Company Disc.</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(detailedSale.return_summary?.returned_company_discount || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Dealer Disc.</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(detailedSale.return_summary?.returned_dealer_discount || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Commission</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(detailedSale.return_summary?.returned_company_commission || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4 md:col-span-3 xl:col-span-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned P/L</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(detailedSale.return_summary?.returned_profit_loss || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-[920px] w-full table-fixed border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-100">
                                <tr className="divide-x divide-gray-200">
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Product</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Quantity</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Pieces</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Returned</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Gross</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Company Disc.</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Final</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">P/L</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {detailedSale.items.map((item) => (
                                    <tr key={`${detailedSale._id}-${item.product_id}`} className="divide-x divide-gray-200">
                                        <td className="px-3 py-2 text-sm font-semibold text-gray-800">{item.product_name}</td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {item.quantity} {formatUnitLabel(item.unit_type)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">{item.quantity_pieces}</td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">{item.returned_quantity_pieces || 0}</td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">{formatCurrency(item.gross_amount)}</td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">{formatCurrency(item.company_discount_amount)}</td>
                                        <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">{formatCurrency(item.final_amount)}</td>
                                        <td className={`px-3 py-2 text-center text-sm font-semibold ${item.profit_loss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                                            {formatCurrency(item.profit_loss)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SaleInvoiceDetailsModal;
