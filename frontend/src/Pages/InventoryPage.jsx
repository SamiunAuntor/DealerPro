import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit3,
    Eye,
    Trash2,
    PackagePlus,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'; // Added the missing imports here
import AddProductModal from '../Componenets/AddProductModal';
import UpdateProductModal from '../Componenets/UpdateProductModal';
import useAxios from '../Hooks/UseAxios';
import Swal from 'sweetalert2';

const InventoryPage = () => {
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const axios = useAxios();
    const [products, setProducts] = useState([]);
    const [deletingId, setDeletingId] = useState(null); // stores which product is being deleted


    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get('/products/get-all-products');
                setProducts(response.data); // store the data in state
            } catch (error) {
                console.error("Failed to fetch products:", error);
            }
        };

        fetchProducts();
    }, []);

    const handleDelete = async (id, code) => {
        const result = await Swal.fire({
            title: `Delete "${code}"?`,
            text: "This action cannot be undone!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel"
        });

        if (result.isConfirmed) {
            try {
                setDeletingId(id); // disable button while deleting
                await axios.delete(`/products/delete-product/${id}`);

                // Refresh products
                const response = await axios.get('/products/get-all-products');
                setProducts(response.data);

                Swal.fire('Deleted!', `"${code}" has been deleted.`, 'success');
            } catch (err) {
                console.error("Delete Error:", err);
                Swal.fire('Error', 'Failed to delete the product.', 'error');
            } finally {
                setDeletingId(null);
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white px-2 py-2">
            {/* Header section - name on left, search/add on right */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 px-1 gap-3">
                <h1 className="text-lg font-bold text-gray-800 tracking-tight shrink-0">Product Inventory</h1>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs w-full sm:w-60 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddProductModalOpen(true)}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 shrink-0"
                    >
                        <Plus size={14} /> <span className=" xs:inline">ADD PRODUCT</span>
                    </button>
                </div>
            </div>

            {/* Grid-Style Table with Gray Borders and Responsive Scroll */}
            <div className="flex-1 overflow-hidden border border-gray-200 rounded flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1100px] lg:min-w-full">
                        <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                            <tr className="divide-x divide-gray-200">
                                <th className="w-[80px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Code</th>
                                <th className="w-[80px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">ID</th>
                                <th className="w-[200px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Product Name</th>
                                <th className="w-[110px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Category</th>
                                <th className="w-[70px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Unit</th>
                                <th className="w-[70px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Pcs/Pkt</th>
                                <th className="w-[70px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Pcs/Ctn</th>
                                <th className="w-[110px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Purchase (৳)</th>
                                <th className="w-[90px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Com. Comm.</th>
                                <th className="w-[80px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Com. Disc.</th>
                                <th className="w-[80px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center">Stock</th>
                                <th className="w-[110px] px-2 py-2 text-[10px] font-bold uppercase text-gray-600 text-center pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {products.map((p) => (
                                <tr key={p._id} className="hover:bg-gray-100 divide-x divide-gray-200 transition-colors">
                                    <td className="px-2 py-1.5 text-xs font-medium text-gray-700 text-center">{p.code}</td>
                                    <td className="px-2 py-1.5 text-xs text-gray-500 text-center">{p.product_id}</td>
                                    <td className="px-2 py-1.5 text-xs font-semibold text-gray-800 truncate text-center">{p.name}</td>
                                    <td className="px-2 py-1.5 text-xs uppercase font-bold text-gray-400 text-center">{p.category}</td>
                                    <td className="px-2 py-1.5 text-center text-xs capitalize">{p.unit_type}</td>
                                    <td className="px-2 py-1.5 text-center text-xs text-gray-500">{p.pieces_per_packet}</td>
                                    <td className="px-2 py-1.5 text-center text-xs text-gray-500">{p.pieces_per_cartoon}</td>
                                    <td className="px-2 py-1.5 text-xs font-bold text-blue-700 bg-blue-50/20 text-center">৳{p.purchase_price}</td>
                                    <td className="px-2 py-1.5 text-center text-xs text-gray-600 font-medium">৳{p.company_commission}</td>
                                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">{p.company_discount}%</td>
                                    <td className="px-2 py-1.5 text-center">
                                        <span className={`text-xs font-bold ${p.stock_count < 20 ? 'text-red-600 font-black' : 'text-blue-600'}`}>
                                            {p.stock_count}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button title="Stock In" className="p-1 text-slate-500 hover:text-blue-600"><PackagePlus size={14} /></button>
                                            <button
                                                title="Edit"
                                                className="p-1 text-slate-500 hover:text-gray-900"
                                                onClick={() => {
                                                    setSelectedProduct(p);
                                                    setIsUpdateModalOpen(true);
                                                }}
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                title="Delete"
                                                className={`p-1 text-red-400 hover:text-red-600 ${deletingId === p._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={deletingId === p._id}
                                                onClick={() => handleDelete(p._id, p.code)}
                                            >
                                                <Trash2 size={16} />
                                            </button>


                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination UI */}
            <div className="mt-2 px-1 flex items-center justify-between shrink-0">
                <p className="text-[10px] text-gray-400 font-medium italic">Showing {products.length} entries</p>
                <div className="flex items-center gap-4">
                    <button className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 uppercase">
                        <ChevronLeft size={12} /> Prev
                    </button>
                    <div className="flex gap-1">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-slate-800 text-white rounded">1</span>
                    </div>
                    <button className="text-[10px] font-bold text-gray-800 hover:text-blue-600 flex items-center gap-1 uppercase">
                        Next <ChevronRight size={12} />
                    </button>
                </div>
            </div>

            <AddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} />
            <UpdateProductModal
                // The key ensures the modal's internal state resets when the product changes
                key={selectedProduct?._id || 'none'}
                isOpen={isUpdateModalOpen}
                onClose={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
                onUpdateSuccess={async () => {
                    try {
                        const response = await axios.get('/products/get-all-products');
                        setProducts(response.data);
                    } catch (error) {
                        console.error('Failed to refresh products:', error);
                    }
                }}
            />

        </div>
    );
};

export default InventoryPage;