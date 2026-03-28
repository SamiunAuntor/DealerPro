import React from "react";
import { X } from "lucide-react";
import { formatCurrency, formatUnitLabel } from "../utils/unitConversion";

function SaleInvoiceDetailsModal({ isOpen, sale, onClose }) {
    if (!isOpen || !sale) {
        return null;
    }

    const hasReturns = Number(sale.return_summary?.returned_quantity_pieces || 0) > 0;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 p-4">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-[#111827]">Invoice Details</h2>
                        <p className="text-xs font-semibold text-gray-500">{sale.invoice_number}</p>
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
                    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Customer</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{sale.customer_snapshot?.name}</p>
                            <p className="text-xs text-gray-500">{sale.customer_snapshot?.phone}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Channel</p>
                            <p className="mt-2 text-sm font-semibold capitalize text-gray-800">{sale.channel}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Subtotal</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{formatCurrency(sale.subtotal_after_company_discount || 0)}</p>
                            <p className="text-xs text-gray-500">After company discount</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Amount</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{formatCurrency(sale.total_amount)}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Dealer Discount</p>
                            <p className="mt-2 text-sm font-semibold text-gray-800">{formatCurrency(sale.total_dealer_discount || 0)}</p>
                            <p className="text-xs text-gray-500">
                                From subtotal {formatCurrency(sale.subtotal_after_company_discount || 0)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Profit / Loss</p>
                            <p className={`mt-2 text-sm font-semibold ${sale.profit_loss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                                {formatCurrency(sale.profit_loss)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Return Status</p>
                            <p className="mt-2 text-sm font-semibold capitalize text-gray-800">
                                {String(sale.return_status || "not_returned").replaceAll("_", " ")}
                            </p>
                            {hasReturns && (
                                <p className="text-xs text-gray-500">
                                    Refunded {formatCurrency(sale.return_summary?.returned_amount || 0)}
                                </p>
                            )}
                        </div>
                    </div>

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
                                        {formatCurrency(sale.return_summary?.returned_amount || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Pieces</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {sale.return_summary?.returned_quantity_pieces || 0}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Company Disc.</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(sale.return_summary?.returned_company_discount || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Dealer Disc.</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(sale.return_summary?.returned_dealer_discount || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned Commission</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(sale.return_summary?.returned_company_commission || 0)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4 md:col-span-3 xl:col-span-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Returned P/L</p>
                                    <p className="mt-2 text-sm font-semibold text-red-700">
                                        {formatCurrency(sale.return_summary?.returned_profit_loss || 0)}
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
                                {sale.items.map((item) => (
                                    <tr key={`${sale._id}-${item.product_id}`} className="divide-x divide-gray-200">
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
