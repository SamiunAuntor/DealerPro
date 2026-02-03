import React, { useState } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Edit3, Eye, Trash2, PackagePlus } from 'lucide-react';
import AddProductModal from '../Componenets/AddProductModal';

const InventoryPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // STATIC DATA: Mapping exactly to Schema 2.1
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
        <div className="flex flex-col h-full w-full bg-white">
            {/* Slim Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Product Inventory</h1>
                    <span className="text-[10px] bg-[#3cc720]/10 px-2 py-0.5 rounded font-bold text-[#3cc720]">LIVE SYSTEM</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Search code/name..." className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm w-64 focus:ring-1 focus:ring-[#3cc720]" />
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-[#3cc720] hover:bg-[#34ad1c] text-white px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-lime-100">
                        <Plus size={16} /> ADD PRODUCT
                    </button>
                </div>
            </div>

            {/* Full Schema Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead className="sticky top-0 z-10 bg-gray-900 text-white">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800">Code</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800">Product ID</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800">Name</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800">Category</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800 text-center">Unit</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800 text-center">Pcs/Pkt</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800 text-center">Pcs/Ctn</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800">Purchase (৳)</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800">Co. Comm (৳)</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800">Co. Disc (%)</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-gray-800 text-center">Stock</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {staticProducts.map((p) => (
                            <tr key={p._id} className="hover:bg-gray-50/80 transition-colors text-gray-700">
                                <td className="px-4 py-3 text-sm font-bold">{p.code}</td>
                                <td className="px-4 py-3 text-[11px] font-medium text-gray-400">{p.product_id}</td>
                                <td className="px-4 py-3 text-sm font-semibold">{p.name}</td>
                                <td className="px-4 py-3 text-[11px] uppercase font-bold text-gray-400">{p.category}</td>
                                <td className="px-4 py-3 text-center text-xs capitalize font-medium">{p.unit_type}</td>
                                <td className="px-4 py-3 text-center text-xs">{p.pieces_per_packet}</td>
                                <td className="px-4 py-3 text-center text-xs">{p.pieces_per_cartoon}</td>
                                <td className="px-4 py-3 text-sm font-black text-gray-900">৳{p.purchase_price}</td>
                                <td className="px-4 py-3 text-sm font-bold text-blue-600">৳{p.company_commission}</td>
                                <td className="px-4 py-3 text-sm font-bold text-[#3cc720]">{p.company_discount}%</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-[10px] font-black uppercase">
                                        {p.stock_count}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <button title="Stock In" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><PackagePlus size={16} /></button>
                                        <button title="View" className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><Eye size={16} /></button>
                                        <button title="Edit" className="p-1.5 text-[#3cc720] hover:bg-green-50 rounded"><Edit3 size={16} /></button>
                                        <button title="Delete" className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-8 py-3 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Showing 100 products per page</p>
                <div className="flex items-center gap-6">
                    <button className="text-[10px] font-black text-gray-300 cursor-not-allowed">PREVIOUS</button>
                    <div className="flex gap-2">
                        {[1, 2, 3].map(n => <span key={n} className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded ${n === 1 ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 cursor-pointer'}`}>{n}</span>)}
                    </div>
                    <button className="text-[10px] font-black text-gray-900 hover:text-[#3cc720]">NEXT PAGE</button>
                </div>
            </div>

            <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default InventoryPage;