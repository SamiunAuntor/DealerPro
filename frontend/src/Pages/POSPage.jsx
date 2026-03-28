import React, { useMemo, useState } from "react";
import { Eye, PackagePlus, ShoppingCart, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import useAxios from "../Hooks/UseAxios";
import SaleInvoiceDetailsModal from "../Componenets/SaleInvoiceDetailsModal";
import {
    UNIT_OPTIONS,
    calculateSalePreview,
    formatCurrency,
    getPiecesPerUnit,
    getStockSummaryLabel,
} from "../utils/unitConversion";

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

function POSPage() {
    const axios = useAxios();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();

    const preselectedCustomerId = searchParams.get("customerId");
    const isCustomerLocked = searchParams.get("lockCustomer") === "true";
    const channel = searchParams.get("channel") === "customer" ? "customer" : "pos";

    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [productToAddId, setProductToAddId] = useState("");
    const [dealerDiscountAmount, setDealerDiscountAmount] = useState(0);
    const [saleItems, setSaleItems] = useState([]);
    const [historyFilters, setHistoryFilters] = useState({
        customer_id: preselectedCustomerId || "",
        channel: channel === "customer" ? "customer" : "pos",
        from: "",
        to: "",
    });
    const [selectedSale, setSelectedSale] = useState(null);

    const customersQuery = useQuery({
        queryKey: ["customers", "all-options"],
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

    const productsQuery = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const response = await axios.get("/products/get-all-products");
            return response.data;
        },
    });

    const salesQuery = useQuery({
        queryKey: ["sales", historyFilters],
        queryFn: async () => {
            const response = await axios.get("/sales", { params: historyFilters });
            return response.data;
        },
    });

    const productMap = useMemo(
        () => new Map((productsQuery.data || []).map((product) => [product._id, product])),
        [productsQuery.data]
    );

    const effectiveSelectedCustomerId = preselectedCustomerId || selectedCustomerId || customersQuery.data?.walkInCustomer?._id || "";

    const selectedCustomer = useMemo(() => {
        if (!customersQuery.data) {
            return null;
        }

        if (effectiveSelectedCustomerId === customersQuery.data.walkInCustomer?._id) {
            return customersQuery.data.walkInCustomer;
        }

        return (customersQuery.data.customers || []).find((customer) => customer._id === effectiveSelectedCustomerId) || null;
    }, [customersQuery.data, effectiveSelectedCustomerId]);

    const previewItems = useMemo(() => {
        const draftItems = saleItems
            .map((item) => {
                const product = productMap.get(item.product_id);

                if (!product) {
                    return null;
                }

                const conversionFactor = getPiecesPerUnit(product, item.unit_type);
                const quantityPieces = conversionFactor > 0 ? (Number(item.quantity) || 0) * conversionFactor : 0;
                const hasInvalidQuantity = !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0;
                const hasInvalidConversion = item.unit_type !== "pieces" && conversionFactor <= 0;
                const hasInsufficientStock = quantityPieces > (product.current_stock_pieces || 0);

                return {
                    ...item,
                    product,
                    preview: calculateSalePreview({
                        product,
                        quantity: item.quantity,
                        unitType: item.unit_type,
                    }),
                    dealerDiscountShareAmount: 0,
                    hasInvalidQuantity,
                    hasInvalidConversion,
                    hasInsufficientStock,
                };
            })
            .filter(Boolean);

        const validDraftItems = draftItems.filter(
            (item) => !item.hasInvalidQuantity && !item.hasInvalidConversion && !item.hasInsufficientStock
        );
        const totalNetBeforeDealer = validDraftItems.reduce((sum, item) => sum + item.preview.netBeforeDealerDiscount, 0);
        const effectiveDealerDiscountAmount = Math.min(Number(dealerDiscountAmount || 0), totalNetBeforeDealer);

        const items = draftItems.reduce(
            (state, item) => {
                let dealerDiscountShare = 0;
                const validItemIndex = validDraftItems.findIndex((draftItem) => draftItem.product_id === item.product_id);

                if (validItemIndex !== -1 && totalNetBeforeDealer > 0) {
                    if (validItemIndex === validDraftItems.length - 1) {
                        dealerDiscountShare = effectiveDealerDiscountAmount - state.allocatedSoFar;
                    } else {
                        dealerDiscountShare = Number(
                            (((item.preview.netBeforeDealerDiscount / totalNetBeforeDealer) * effectiveDealerDiscountAmount)).toFixed(2)
                        );
                    }
                }

                return {
                    allocatedSoFar: state.allocatedSoFar + dealerDiscountShare,
                    items: [
                        ...state.items,
                        {
                            ...item,
                            dealerDiscountShareAmount: dealerDiscountShare,
                            preview: calculateSalePreview({
                                product: item.product,
                                quantity: item.quantity,
                                unitType: item.unit_type,
                                dealerDiscountShare,
                            }),
                        },
                    ],
                };
            },
            { allocatedSoFar: 0, items: [] }
        ).items;

        return {
            items,
            effectiveDealerDiscountAmount,
        };
    }, [dealerDiscountAmount, productMap, saleItems]);

    const totals = useMemo(() => {
        return previewItems.items.reduce(
            (summary, item) => ({
                grossAmount: summary.grossAmount + (item.hasInvalidQuantity || item.hasInvalidConversion || item.hasInsufficientStock ? 0 : item.preview.grossAmount),
                companyDiscountAmount: summary.companyDiscountAmount + (item.hasInvalidQuantity || item.hasInvalidConversion || item.hasInsufficientStock ? 0 : item.preview.companyDiscountAmount),
                finalAmount: summary.finalAmount + (item.hasInvalidQuantity || item.hasInvalidConversion || item.hasInsufficientStock ? 0 : item.preview.finalAmount),
                profitLoss: summary.profitLoss + (item.hasInvalidQuantity || item.hasInvalidConversion || item.hasInsufficientStock ? 0 : item.preview.profitLoss),
            }),
            {
                grossAmount: 0,
                companyDiscountAmount: 0,
                finalAmount: 0,
                profitLoss: 0,
            }
        );
    }, [previewItems]);

    const hasInvalidSaleState = previewItems.items.some(
        (item) => item.hasInvalidQuantity || item.hasInvalidConversion || item.hasInsufficientStock
    );

    const createSaleMutation = useMutation({
        mutationFn: (payload) => axios.post("/sales", payload),
        onSuccess: async (response) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["products"] }),
                queryClient.invalidateQueries({ queryKey: ["sales"] }),
            ]);

            setSaleItems([]);
            setDealerDiscountAmount(0);
            setProductToAddId("");

            if (!isCustomerLocked) {
                setSelectedCustomerId("");
            }

            setSelectedSale(response.data.sale);
            Swal.fire("Success", "Sale completed successfully.", "success");

            if (isCustomerLocked) {
                navigate("/pos", { replace: true });
            }
        },
        onError: (error) => {
            Swal.fire("Error", error.response?.data?.message || "Failed to create sale.", "error");
        },
    });

    const handleAddProduct = () => {
        if (!productToAddId) {
            return;
        }

        if (saleItems.some((item) => item.product_id === productToAddId)) {
            Swal.fire("Warning", "This product is already in the sale. Adjust its quantity instead.", "warning");
            return;
        }

        const product = productMap.get(productToAddId);

        if (!product) {
            return;
        }

        setSaleItems((prev) => [
            ...prev,
            {
                product_id: product._id,
                quantity: 1,
                unit_type: product.unit_type,
            },
        ]);
        setProductToAddId("");
    };

    const handleItemChange = (productId, field, value) => {
        setSaleItems((prev) =>
            prev.map((item) =>
                item.product_id === productId
                    ? { ...item, [field]: field === "quantity" ? Number(value) || 0 : value }
                    : item
            )
        );
    };

    const handleRemoveItem = (productId) => {
        setSaleItems((prev) => prev.filter((item) => item.product_id !== productId));
    };

    const handleSubmitSale = () => {
        if (!effectiveSelectedCustomerId) {
            Swal.fire("Error", "Please choose a customer first.", "error");
            return;
        }

        if (saleItems.length === 0) {
            Swal.fire("Error", "Please add at least one product to the sale.", "error");
            return;
        }

        if (hasInvalidSaleState) {
            Swal.fire("Error", "Please fix invalid quantity, conversion, or stock issues before completing the sale.", "error");
            return;
        }

        createSaleMutation.mutate({
            customer_id: effectiveSelectedCustomerId,
            channel,
            dealer_discount_amount: previewItems.effectiveDealerDiscountAmount,
            items: saleItems.map((item) => ({
                product_id: item.product_id,
                quantity: Number(item.quantity),
                unit_type: item.unit_type,
            })),
        });
    };

    return (
        <div className="flex h-full w-full flex-col gap-4 bg-white p-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">Point Of Sale</h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            {isCustomerLocked ? "Customer sale flow" : "POS flow"}
                        </p>
                    </div>
                    <div className="rounded-full bg-[#111827] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#3cc720]">
                        {selectedCustomer ? selectedCustomer.name : "Select customer"}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">Customer</label>
                                <select
                                    className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm font-semibold outline-none focus:border-[#3cc720] disabled:bg-gray-100"
                                    disabled={isCustomerLocked}
                                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                                    value={effectiveSelectedCustomerId}
                                >
                                    <option value="">Select customer</option>
                                    {customersQuery.data?.walkInCustomer && (
                                        <option value={customersQuery.data.walkInCustomer._id}>
                                            {customersQuery.data.walkInCustomer.name}
                                        </option>
                                    )}
                                    {(customersQuery.data?.customers || []).map((customer) => (
                                        <option key={customer._id} value={customer._id}>
                                            {customer.name} - {customer.phone}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">Dealer Discount</label>
                                <input
                                    className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm font-semibold outline-none focus:border-[#3cc720]"
                                    min="0"
                                    onChange={(event) => setDealerDiscountAmount(Number(event.target.value) || 0)}
                                    type="number"
                                    value={dealerDiscountAmount}
                                />
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                            <select
                                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm font-semibold outline-none focus:border-[#3cc720]"
                                onChange={(event) => setProductToAddId(event.target.value)}
                                value={productToAddId}
                            >
                                <option value="">Select product to add</option>
                                {(productsQuery.data || []).map((product) => (
                                    <option key={product._id} value={product._id}>
                                        {product.code} - {product.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="flex items-center justify-center gap-2 rounded bg-slate-800 px-4 py-2 text-xs font-bold uppercase text-white transition-all hover:bg-slate-900"
                                onClick={handleAddProduct}
                                type="button"
                            >
                                <PackagePlus size={14} />
                                Add Product
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-[1080px] w-full table-fixed border-collapse text-left">
                                <thead className="border-b border-gray-200 bg-gray-100">
                                    <tr className="divide-x divide-gray-200">
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Product</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Stock</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Unit</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Quantity</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Pieces</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Gross</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Company Disc.</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Final</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">P/L</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {previewItems.items.length === 0 && (
                                        <tr>
                                            <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={10}>
                                                No products added yet.
                                            </td>
                                        </tr>
                                    )}
                                    {previewItems.items.map((item) => {
                                        return (
                                            <tr key={item.product_id} className="divide-x divide-gray-200">
                                                <td className="px-3 py-2">
                                                    <p className="text-sm font-semibold text-gray-800">{item.product.name}</p>
                                                    <p className="text-[11px] text-gray-500">{item.product.code}</p>
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs text-gray-600">{getStockSummaryLabel(item.product.stock_summary)}</td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                                                        onChange={(event) => handleItemChange(item.product_id, "unit_type", event.target.value)}
                                                        value={item.unit_type}
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
                                                        className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                                                        min="1"
                                                        onChange={(event) => handleItemChange(item.product_id, "quantity", event.target.value)}
                                                        type="number"
                                                        value={item.quantity}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm text-gray-700">{item.preview.quantityPieces}</td>
                                                <td className="px-3 py-2 text-center text-sm text-gray-700">{formatCurrency(item.preview.grossAmount)}</td>
                                                <td className="px-3 py-2 text-center text-sm text-gray-700">{formatCurrency(item.preview.companyDiscountAmount)}</td>
                                                <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">{formatCurrency(item.preview.finalAmount)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className={`text-sm font-semibold ${item.preview.profitLoss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                                                        {formatCurrency(item.preview.profitLoss)}
                                                    </div>
                                                    {item.preview.profitLoss < 0 && (
                                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                                                            Effective purchase price is {formatCurrency(item.preview.purchasePricePerPiece)} per piece and this line is going at loss.
                                                        </p>
                                                    )}
                                                    {item.hasInvalidQuantity && (
                                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                                                            Quantity must be greater than zero.
                                                        </p>
                                                    )}
                                                    {item.hasInvalidConversion && (
                                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                                                            This unit conversion is not configured for the product.
                                                        </p>
                                                    )}
                                                    {item.hasInsufficientStock && (
                                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                                                            Required {item.preview.quantityPieces} pcs but only {item.product.current_stock_pieces} pcs available.
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button className="p-1 text-red-500" onClick={() => handleRemoveItem(item.product_id)} type="button">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Selected Customer</p>
                            <p className="mt-2 text-base font-semibold text-gray-900">{selectedCustomer?.name || "None"}</p>
                            <p className="text-sm text-gray-500">{selectedCustomer?.phone || "-"}</p>
                        </div>

                        <div className="grid gap-3">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Gross Amount</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900">{formatCurrency(totals.grossAmount)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Company Discount</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900">{formatCurrency(totals.companyDiscountAmount)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Dealer Discount</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900">{formatCurrency(previewItems.effectiveDealerDiscountAmount)}</p>
                                {previewItems.effectiveDealerDiscountAmount !== Number(dealerDiscountAmount || 0) && (
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                                        Dealer discount was capped to the valid invoice amount.
                                    </p>
                                )}
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Final Amount</p>
                                <p className="mt-2 text-2xl font-black text-gray-900">{formatCurrency(totals.finalAmount)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Profit / Loss</p>
                                <p className={`mt-2 text-lg font-black ${totals.profitLoss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                                    {formatCurrency(totals.profitLoss)}
                                </p>
                            </div>
                        </div>

                        <button
                            className="flex w-full items-center justify-center gap-2 rounded bg-[#111827] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#3cc720] shadow-lg transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={createSaleMutation.isPending || hasInvalidSaleState}
                            onClick={handleSubmitSale}
                            type="button"
                        >
                            <ShoppingCart size={16} />
                            {createSaleMutation.isPending ? "Processing..." : "Complete Sale"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">Sales History</h2>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Immutable invoices and quick lookup</p>
                    </div>
                    <div className="grid w-full gap-2 md:w-auto md:grid-cols-4">
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) => setHistoryFilters((prev) => ({ ...prev, from: event.target.value }))}
                            type="date"
                            value={historyFilters.from}
                        />
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) => setHistoryFilters((prev) => ({ ...prev, to: event.target.value }))}
                            type="date"
                            value={historyFilters.to}
                        />
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) => setHistoryFilters((prev) => ({ ...prev, channel: event.target.value }))}
                            value={historyFilters.channel}
                        >
                            <option value="">All channels</option>
                            <option value="pos">POS</option>
                            <option value="customer">Customer</option>
                        </select>
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) => setHistoryFilters((prev) => ({ ...prev, customer_id: event.target.value }))}
                            value={historyFilters.customer_id}
                        >
                            <option value="">All customers</option>
                            {(customersQuery.data?.customers || []).map((customer) => (
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
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Invoice</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Customer</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Channel</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Amount</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Profit / Loss</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Created</th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Action</th>
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
                                    <td className="px-3 py-2 text-center text-xs font-semibold text-gray-800">{sale.invoice_number}</td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-700">{sale.customer_snapshot?.name}</td>
                                    <td className="px-3 py-2 text-center text-sm capitalize text-gray-700">{sale.channel}</td>
                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">{formatCurrency(sale.total_amount)}</td>
                                    <td className={`px-3 py-2 text-center text-sm font-semibold ${sale.profit_loss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                                        {formatCurrency(sale.profit_loss)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">{formatDateTime(sale.created_at)}</td>
                                    <td className="px-3 py-2 text-center">
                                        <button className="p-1 text-blue-500" onClick={() => setSelectedSale(sale)} type="button">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <SaleInvoiceDetailsModal isOpen={Boolean(selectedSale)} onClose={() => setSelectedSale(null)} sale={selectedSale} />
        </div>
    );
}

export default POSPage;
