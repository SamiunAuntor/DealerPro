import React, { useState } from 'react';
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

const InventoryPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const staticProducts = [
        {
            _id: '1', code: 'CEM-001', product_id: 'PID-9921', name: 'Holcim Strong Structure',
            category: 'Construction', company_commission: 45, company_discount: 2,
            unit_type: 'box', pieces_per_packet: 1, pieces_per_cartoon: 20,
            purchase_price: 540, stock_count: 850
        },
        {
            _id: '2', code: 'STL-772', product_id: 'PID-4432', name: 'BSRM Xtreme 500W',
            category: 'Hardware', company_commission: 120, company_discount: 1.5,
            unit_type: 'pieces', pieces_per_packet: 0, pieces_per_cartoon: 50,
            purchase_price: 92000, stock_count: 15
        }
    ];

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
                        onClick={() => setIsModalOpen(true)}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 shrink-0"
                    >
                        <Plus size={14} /> <span className="hidden xs:inline">ADD PRODUCT</span>
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
                            {staticProducts.map((p) => (
                                <tr key={p._id} className="hover:bg-gray-100 divide-x divide-gray-200 transition-colors">
                                    <td className="px-2 py-1.5 text-xs font-medium text-gray-700 text-center">{p.code}</td>
                                    <td className="px-2 py-1.5 text-[10px] text-gray-500 text-center">{p.product_id}</td>
                                    <td className="px-2 py-1.5 text-xs font-semibold text-gray-800 truncate text-center">{p.name}</td>
                                    <td className="px-2 py-1.5 text-[10px] uppercase font-bold text-gray-400 text-center">{p.category}</td>
                                    <td className="px-2 py-1.5 text-center text-[10px] capitalize">{p.unit_type}</td>
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
                                        <div className="flex items-center justify-end gap-1">
                                            <button title="Stock In" className="p-1 text-slate-500 hover:text-blue-600"><PackagePlus size={14} /></button>
                                            <button title="Edit" className="p-1 text-slate-500 hover:text-gray-900"><Edit3 size={14} /></button>
                                            <button title="Delete" className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
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
                <p className="text-[10px] text-gray-400 font-medium italic">Showing {staticProducts.length} entries</p>
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

            <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default InventoryPage;