import React, { useState } from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";
import useAxios from "../Hooks/UseAxios";
import { UNIT_OPTIONS, formatCurrency, formatUnitLabel, getStockSummaryLabel } from "../utils/unitConversion";

function StockInModal({ isOpen, onClose, product, onUpdateSuccess }) {
    const [quantity, setQuantity] = useState("");
    const [unitType, setUnitType] = useState("pieces");
    const [loading, setLoading] = useState(false);
    const axios = useAxios();

    if (!isOpen || !product) {
        return null;
    }

    const handleStockIn = async () => {
        if (!quantity || Number(quantity) <= 0) {
            Swal.fire("Error", "Please enter a valid quantity", "error");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`/products/stock-in/${product._id}`, {
                quantity: Number(quantity),
                unit_type: unitType,
            });

            Swal.fire({
                icon: "success",
                title: "Stock Updated",
                text: `${quantity} ${unitType} added to ${product.code}`,
                timer: 1500,
                showConfirmButton: false,
            });

            setQuantity("");
            setUnitType("pieces");
            onUpdateSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire("Error", error.response?.data?.message || "Failed to update stock", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-11/12 max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-800">Add Stock</h2>
                    <button className="text-gray-400 transition-colors hover:text-gray-600" onClick={onClose} type="button">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 p-6">
                    <div className="text-left">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Product Name</label>
                        <p className="text-base font-semibold uppercase text-slate-800">{product.name}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="text-left">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Product Code</label>
                            <p className="text-sm font-medium text-slate-600">{product.code}</p>
                        </div>
                        <div className="text-left">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Current Stock</label>
                            <p className="text-sm font-bold text-blue-600">{getStockSummaryLabel(product.stock_summary)}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Purchase Price Per {formatUnitLabel(product.unit_type)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">{formatCurrency(product.purchase_price)}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="text-left">
                            <label className="mb-2 block text-xs font-bold text-slate-700">Quantity</label>
                            <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-800/10"
                                onChange={(event) => setQuantity(event.target.value)}
                                placeholder="Enter amount"
                                type="number"
                                value={quantity}
                            />
                        </div>
                        <div className="text-left">
                            <label className="mb-2 block text-xs font-bold text-slate-700">Unit</label>
                            <select
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-800/10"
                                onChange={(event) => setUnitType(event.target.value)}
                                value={unitType}
                            >
                                {UNIT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end bg-gray-50 px-6 py-4">
                    <button
                        className="w-full rounded bg-slate-800 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-900 disabled:opacity-50"
                        disabled={loading}
                        onClick={handleStockIn}
                        type="button"
                    >
                        {loading ? "PROCESSING..." : "ADD STOCK"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StockInModal;
