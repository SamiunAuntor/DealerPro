import React, { useMemo, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import useAxios from "../Hooks/UseAxios";
import {
    UNIT_OPTIONS,
    formatCurrency,
    formatUnitLabel,
    getPiecesPerUnit,
} from "../utils/unitConversion";

function ReturnSaleModal({ isOpen, sale, onClose }) {
    const axios = useAxios();
    const queryClient = useQueryClient();
    const [returnItems, setReturnItems] = useState(() =>
        (sale?.items || []).map((item) => ({
            product_id: item.product_id,
            quantity: "",
            unit_type: item.unit_type || "pieces",
        }))
    );

    const productsQuery = useQuery({
        queryKey: ["products", "return-modal"],
        queryFn: async () => {
            const response = await axios.get("/products/get-all-products");
            return response.data;
        },
        enabled: isOpen,
    });

    const productMap = useMemo(
        () => new Map((productsQuery.data || []).map((product) => [String(product._id), product])),
        [productsQuery.data]
    );

    const previewRows = useMemo(() => {
        if (!sale) {
            return [];
        }

        const draftRows = (sale.items || []).map((saleItem) => {
            const draft = returnItems.find(
                (item) => String(item.product_id) === String(saleItem.product_id)
            ) || {
                quantity: "",
                unit_type: saleItem.unit_type || "pieces",
            };

            const product = productMap.get(String(saleItem.product_id));
            const piecesPerUnit = product
                ? getPiecesPerUnit(product, draft.unit_type)
                : draft.unit_type === "pieces"
                  ? 1
                  : 0;
            const requestedQuantity = Number(draft.quantity) || 0;
            const requestedPieces =
                piecesPerUnit > 0 ? requestedQuantity * piecesPerUnit : 0;
            const returnedPieces = Number(saleItem.returned_quantity_pieces || 0);
            const soldPieces = Number(saleItem.quantity_pieces || 0);
            const remainingPieces = soldPieces - returnedPieces;
            const invalidQuantity = requestedQuantity < 0;
            const invalidConversion = draft.unit_type !== "pieces" && piecesPerUnit <= 0;
            const exceedsRemaining = requestedPieces > remainingPieces;
            const hasRequestedReturn = requestedQuantity > 0;
            const grossRefund = Number(saleItem.sale_price || 0) * requestedPieces;
            const companyDiscountRefund =
                (grossRefund * Number(saleItem.company_discount_rate || 0)) / 100;
            const subtotalAfterCompanyDiscountRefund = grossRefund - companyDiscountRefund;
            const commissionRefund =
                Number(saleItem.company_commission_per_piece || 0) * requestedPieces;

            return {
                saleItem,
                draft,
                requestedQuantity,
                requestedPieces,
                remainingPieces,
                invalidQuantity,
                invalidConversion,
                exceedsRemaining,
                hasRequestedReturn,
                grossRefund,
                companyDiscountRefund,
                subtotalAfterCompanyDiscountRefund,
                dealerDiscountRefund: 0,
                finalRefund: subtotalAfterCompanyDiscountRefund,
                commissionRefund,
                profitLossRefund:
                    subtotalAfterCompanyDiscountRefund -
                    Number(saleItem.purchase_price || 0) * requestedPieces,
            };
        });

        const originalSubtotalAfterCompanyDiscount = Number(
            sale.subtotal_after_company_discount ||
                (sale.items || []).reduce(
                    (sum, item) => sum + Number(item.net_amount_before_dealer_discount || 0),
                    0
                )
        );
        const requestedSubtotalAfterCompanyDiscount = draftRows.reduce((sum, row) => {
            const isInvalid = row.invalidQuantity || row.invalidConversion || row.exceedsRemaining;
            return sum + (row.hasRequestedReturn && !isInvalid ? row.subtotalAfterCompanyDiscountRefund : 0);
        }, 0);
        const totalDealerDiscountRefund =
            originalSubtotalAfterCompanyDiscount > 0
                ? Number(
                      (
                          (Number(sale.total_dealer_discount || 0) *
                              requestedSubtotalAfterCompanyDiscount) /
                          originalSubtotalAfterCompanyDiscount
                      ).toFixed(2)
                  )
                : 0;

        const eligibleRows = draftRows.filter((row) => {
            const isInvalid = row.invalidQuantity || row.invalidConversion || row.exceedsRemaining;
            return row.hasRequestedReturn && !isInvalid;
        });

        let allocatedDealerDiscount = 0;

        return draftRows.map((row) => {
            const isEligible = eligibleRows.some(
                (eligibleRow) => String(eligibleRow.saleItem.product_id) === String(row.saleItem.product_id)
            );

            if (!isEligible || requestedSubtotalAfterCompanyDiscount <= 0) {
                return row;
            }

            const eligibleIndex = eligibleRows.findIndex(
                (eligibleRow) => String(eligibleRow.saleItem.product_id) === String(row.saleItem.product_id)
            );
            const dealerDiscountRefund =
                eligibleIndex === eligibleRows.length - 1
                    ? Number((totalDealerDiscountRefund - allocatedDealerDiscount).toFixed(2))
                    : Number(
                          (
                              (row.subtotalAfterCompanyDiscountRefund / requestedSubtotalAfterCompanyDiscount) *
                              totalDealerDiscountRefund
                          ).toFixed(2)
                      );

            allocatedDealerDiscount = Number((allocatedDealerDiscount + dealerDiscountRefund).toFixed(2));

            const finalRefund = row.subtotalAfterCompanyDiscountRefund - dealerDiscountRefund;

            return {
                ...row,
                dealerDiscountRefund,
                finalRefund,
                profitLossRefund:
                    finalRefund - Number(row.saleItem.purchase_price || 0) * row.requestedPieces,
            };
        });
    }, [productMap, returnItems, sale]);

    const totals = useMemo(
        () =>
            previewRows.reduce(
                (summary, row) => {
                    const isInvalid =
                        row.invalidQuantity || row.invalidConversion || row.exceedsRemaining;

                    if (!row.hasRequestedReturn || isInvalid) {
                        return summary;
                    }

                    return {
                        totalAmountRefunded: summary.totalAmountRefunded + row.finalRefund,
                        totalDealerDiscountRefunded:
                            summary.totalDealerDiscountRefunded + row.dealerDiscountRefund,
                        totalCompanyCommissionRefunded:
                            summary.totalCompanyCommissionRefunded + row.commissionRefund,
                        totalProfitLossRefunded:
                            summary.totalProfitLossRefunded + row.profitLossRefund,
                    };
                },
                {
                    totalAmountRefunded: 0,
                    totalDealerDiscountRefunded: 0,
                    totalCompanyCommissionRefunded: 0,
                    totalProfitLossRefunded: 0,
                }
            ),
        [previewRows]
    );

    const hasInvalidState = previewRows.some(
        (row) =>
            row.invalidQuantity ||
            row.invalidConversion ||
            row.exceedsRemaining
    );
    const hasReturnSelection = previewRows.some((row) => row.hasRequestedReturn);

    const createReturnMutation = useMutation({
        mutationFn: (payload) => axios.post("/returns", payload),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["sales"] }),
                queryClient.invalidateQueries({ queryKey: ["products"] }),
                queryClient.invalidateQueries({ queryKey: ["sales", "company-due"] }),
                queryClient.invalidateQueries({ queryKey: ["returns"] }),
            ]);

            Swal.fire("Success", "Return created successfully.", "success");
            onClose();
        },
        onError: (error) => {
            Swal.fire(
                "Error",
                error.response?.data?.message || "Failed to create return.",
                "error"
            );
        },
    });

    if (!isOpen || !sale) {
        return null;
    }

    const handleItemChange = (productId, field, value) => {
        setReturnItems((prev) =>
            prev.map((item) =>
                String(item.product_id) === String(productId)
                    ? {
                          ...item,
                          [field]: field === "quantity" ? value : value,
                      }
                    : item
            )
        );
    };

    const handleFillFullReturn = () => {
        setReturnItems(
            (sale.items || []).map((item) => ({
                product_id: item.product_id,
                quantity: Number(item.quantity_pieces || 0) - Number(item.returned_quantity_pieces || 0),
                unit_type: "pieces",
            }))
        );
    };

    const handleSubmit = async () => {
        if (!hasReturnSelection) {
            Swal.fire("Error", "Please select at least one product quantity to return.", "error");
            return;
        }

        if (hasInvalidState) {
            Swal.fire("Error", "Please fix invalid return quantities before continuing.", "error");
            return;
        }

        const result = await Swal.fire({
            title: "Confirm return",
            html: `
                <div style="text-align:left;">
                    <p>Generate a return for invoice <strong>${sale.invoice_number}</strong>?</p>
                    <p style="margin-top:8px;color:#475569;font-size:12px;font-weight:700;">
                        Dealer discount will be refunded proportionally from the invoice-level discount.
                    </p>
                </div>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#111827",
            cancelButtonColor: "#d1d5db",
            confirmButtonText: "Yes, create return",
            cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) {
            return;
        }

        createReturnMutation.mutate({
            original_sale_id: sale._id,
            items: previewRows
                .filter((row) => row.hasRequestedReturn)
                .map((row) => ({
                    product_id: row.saleItem.product_id,
                    quantity: row.requestedQuantity,
                    unit_type: row.draft.unit_type,
                })),
        });
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 p-4">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-[#111827]">
                            Return Sale
                        </h2>
                        <p className="text-xs font-semibold text-gray-500">
                            {sale.invoice_number} | {sale.customer_snapshot?.name}
                        </p>
                    </div>
                    <button
                        className="rounded-full p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                        onClick={onClose}
                        type="button"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto p-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Refund Amount
                            </p>
                            <p className="mt-2 text-xl font-black text-gray-900">
                                {formatCurrency(totals.totalAmountRefunded)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Commission Reversal
                            </p>
                            <p className="mt-2 text-lg font-semibold text-gray-900">
                                {formatCurrency(totals.totalCompanyCommissionRefunded)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Profit / Loss Reversal
                            </p>
                            <p className="mt-2 text-lg font-semibold text-gray-900">
                                {formatCurrency(totals.totalProfitLossRefunded)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Dealer Discount
                            </p>
                            <p className="mt-2 text-lg font-semibold text-gray-900">
                                {formatCurrency(totals.totalDealerDiscountRefunded)}
                            </p>
                            <p className="text-xs text-gray-500">
                                Refunded proportionally from invoice-level discount.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            className="flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-700 transition hover:border-[#3cc720] hover:text-[#111827]"
                            onClick={handleFillFullReturn}
                            type="button"
                        >
                            <RotateCcw size={14} />
                            Full Return Remaining Quantity
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-[1200px] w-full table-fixed border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-100">
                                <tr className="divide-x divide-gray-200">
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Product</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Sold</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Returned</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Remaining</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Unit</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Return Qty</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Return Pcs</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Dealer Disc.</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Refund</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Commission</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {previewRows.map((row) => (
                                    <tr key={`${sale._id}-${row.saleItem.product_id}`} className="divide-x divide-gray-200">
                                        <td className="px-3 py-2">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {row.saleItem.product_name}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                {row.saleItem.product_code}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {row.saleItem.quantity} {formatUnitLabel(row.saleItem.unit_type)}
                                            <div className="text-[11px] text-gray-400">
                                                {row.saleItem.quantity_pieces} pcs
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {row.saleItem.returned_quantity_pieces || 0} pcs
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">
                                            {row.remainingPieces} pcs
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                                                onChange={(event) =>
                                                    handleItemChange(
                                                        row.saleItem.product_id,
                                                        "unit_type",
                                                        event.target.value
                                                    )
                                                }
                                                value={row.draft.unit_type}
                                            >
                                                {UNIT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none placeholder:font-medium placeholder:text-gray-400 focus:border-[#3cc720]"
                                                min="0"
                                                onChange={(event) =>
                                                    handleItemChange(
                                                        row.saleItem.product_id,
                                                        "quantity",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="0"
                                                type="number"
                                                value={row.draft.quantity}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {row.requestedPieces}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {formatCurrency(row.dealerDiscountRefund)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">
                                            {formatCurrency(row.finalRefund)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {formatCurrency(row.commissionRefund)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {row.invalidQuantity && (
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                                                    Invalid quantity
                                                </p>
                                            )}
                                            {row.invalidConversion && (
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                                                    Missing conversion
                                                </p>
                                            )}
                                            {row.exceedsRemaining && (
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                                                    Exceeds remaining
                                                </p>
                                            )}
                                            {!row.invalidQuantity &&
                                                !row.invalidConversion &&
                                                !row.exceedsRemaining &&
                                                !row.hasRequestedReturn && (
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                        No return
                                                    </p>
                                                )}
                                            {!row.invalidQuantity &&
                                                !row.invalidConversion &&
                                                !row.exceedsRemaining &&
                                                row.hasRequestedReturn && (
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                                        Ready
                                                    </p>
                                                )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <button
                            className="flex items-center justify-center gap-2 rounded bg-[#111827] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#3cc720] shadow-lg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={
                                createReturnMutation.isPending ||
                                !hasReturnSelection ||
                                hasInvalidState
                            }
                            onClick={handleSubmit}
                            type="button"
                        >
                            <RotateCcw size={16} />
                            {createReturnMutation.isPending ? "Processing..." : "Create Return"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReturnSaleModal;
