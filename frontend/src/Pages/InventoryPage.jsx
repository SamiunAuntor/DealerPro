import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Edit3, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import AddProductModal from "../Componenets/AddProductModal";
import StockInModal from "../Componenets/StockInModal";
import UpdateProductModal from "../Componenets/UpdateProductModal";
import useAxios from "../Hooks/UseAxios";
import { formatCurrency, formatUnitLabel, getStockSummaryLabel } from "../utils/unitConversion";

function InventoryPage() {
    const axios = useAxios();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const productsQuery = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const response = await axios.get("/products/get-all-products");
            return response.data;
        },
    });

    const deleteProductMutation = useMutation({
        mutationFn: (id) => axios.delete(`/products/delete-product/${id}`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["products"] });
            Swal.fire("Deleted!", "Product deleted successfully.", "success");
        },
        onError: (error) => {
            Swal.fire("Error", error.response?.data?.message || "Failed to delete the product.", "error");
        },
    });

    const filteredProducts = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return productsQuery.data || [];
        }

        return (productsQuery.data || []).filter((product) => {
            return (
                product.name.toLowerCase().includes(normalizedSearch) ||
                product.code.toLowerCase().includes(normalizedSearch) ||
                product.product_id.toLowerCase().includes(normalizedSearch)
            );
        });
    }, [productsQuery.data, searchTerm]);

    const handleDelete = async (product) => {
        const result = await Swal.fire({
            title: `Delete "${product.code}"?`,
            text: "This action cannot be undone!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        });

        if (result.isConfirmed) {
            deleteProductMutation.mutate(product._id);
        }
    };

    const getStockState = (product) => {
        const currentStockPieces = Number(product.current_stock_pieces || 0);
        const lowStockThreshold = Number(product.low_stock_threshold ?? 20);

        if (currentStockPieces <= 0) {
            return "out";
        }

        if (currentStockPieces <= lowStockThreshold) {
            return "low";
        }

        return "normal";
    };

    return (
        <div className="flex h-full w-full flex-col bg-white px-2 py-2">
            <div className="mb-3 flex flex-col items-start justify-between gap-3 px-1 sm:flex-row sm:items-center">
                <h1 className="shrink-0 text-lg font-bold tracking-tight text-gray-800">Product Inventory</h1>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            className="w-full rounded border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none sm:w-60"
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search..."
                            type="text"
                            value={searchTerm}
                        />
                    </div>
                    <button
                        className="flex shrink-0 items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-slate-900"
                        onClick={() => setIsAddProductModalOpen(true)}
                        type="button"
                    >
                        <Plus size={14} />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded border border-gray-200">
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-[1120px] w-full table-fixed border-collapse text-left lg:min-w-full">
                        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100">
                            <tr className="divide-x divide-gray-200">
                                <th className="w-[72px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Code</th>
                                <th className="w-[72px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">ID</th>
                                <th className="w-[200px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Product Name</th>
                                <th className="w-[100px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Category</th>
                                <th className="w-[84px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Default Unit</th>
                                <th className="w-[64px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Pcs/Pkt</th>
                                <th className="w-[64px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Pcs/Ctn</th>
                                <th className="w-[104px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Purchase</th>
                                <th className="w-[104px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Selling</th>
                                <th className="w-[76px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Com. Comm.</th>
                                <th className="w-[74px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Com. Disc.</th>
                                <th className="w-[150px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Stock</th>
                                <th className="w-[92px] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredProducts.map((product) => {
                                const stockState = getStockState(product);
                                const rowClassName =
                                    stockState === "out"
                                        ? "bg-red-50 hover:bg-red-100"
                                        : stockState === "low"
                                          ? "bg-amber-50 hover:bg-amber-100"
                                          : "hover:bg-gray-100";
                                const stockTextClassName =
                                    stockState === "out"
                                        ? "text-red-600"
                                        : stockState === "low"
                                          ? "text-amber-600"
                                          : "text-blue-600";

                                return (
                                <tr key={product._id} className={`divide-x divide-gray-200 transition-colors ${rowClassName}`}>
                                    <td className="px-2 py-1 text-center text-xs font-medium text-gray-700">{product.code}</td>
                                    <td className="px-2 py-1 text-center text-xs text-gray-500">{product.product_id}</td>
                                    <td className="px-2 py-1 text-center text-xs font-semibold text-gray-800">{product.name}</td>
                                    <td className="px-2 py-1 text-center text-xs font-bold uppercase text-gray-400">{product.category}</td>
                                    <td className="px-2 py-1 text-center text-xs capitalize">{formatUnitLabel(product.unit_type)}</td>
                                    <td className="px-2 py-1 text-center text-xs text-gray-500">{product.pieces_per_packet}</td>
                                    <td className="px-2 py-1 text-center text-xs text-gray-500">{product.pieces_per_cartoon}</td>
                                    <td className="px-2 py-1 text-center text-xs font-bold text-blue-700">{formatCurrency(product.purchase_price)}</td>
                                    <td className="px-2 py-1 text-center text-xs font-bold text-emerald-700">{formatCurrency(product.selling_price)}</td>
                                    <td className="px-2 py-1 text-center text-xs font-medium text-gray-600">{formatCurrency(product.company_commission)}</td>
                                    <td className="px-2 py-1 text-center text-xs text-gray-600">{product.company_discount}%</td>
                                    <td className="px-2 py-1 text-center">
                                        <span className={`text-xs font-bold ${stockTextClassName}`}>
                                            {getStockSummaryLabel(product.stock_summary)}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                className="p-1 text-green-500"
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setIsStockInModalOpen(true);
                                                }}
                                                type="button"
                                            >
                                                <PackagePlus size={16} />
                                            </button>
                                            <button
                                                className="p-1 text-blue-500"
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setIsUpdateModalOpen(true);
                                                }}
                                                type="button"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button className="p-1 text-red-500" onClick={() => handleDelete(product)} type="button">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-2 flex shrink-0 items-center justify-between px-1">
                <p className="text-[10px] font-medium italic text-gray-400">Showing {filteredProducts.length} entries</p>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 hover:text-gray-600" type="button">
                        <ChevronLeft size={12} /> Prev
                    </button>
                    <div className="flex gap-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-white">1</span>
                    </div>
                    <button className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-800 hover:text-blue-600" type="button">
                        Next <ChevronRight size={12} />
                    </button>
                </div>
            </div>

            <AddProductModal
                isOpen={isAddProductModalOpen}
                onClose={() => setIsAddProductModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
            />

            <UpdateProductModal
                key={selectedProduct?._id || "none"}
                isOpen={isUpdateModalOpen}
                onClose={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
                onUpdateSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
            />

            <StockInModal
                isOpen={isStockInModalOpen}
                onClose={() => {
                    setIsStockInModalOpen(false);
                    setSelectedProduct(null);
                }}
                onUpdateSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
                product={selectedProduct}
            />
        </div>
    );
}

export default InventoryPage;
