import React from 'react';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';

const AddProductModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Success',
            text: 'Product Registered Successfully',
            icon: 'success',
            confirmButtonColor: '#3cc720',
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Product Registration</h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Top Row: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Product Code</label>
                            <input type="text" required className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded text-sm focus:border-[#3cc720] outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Product ID</label>
                            <input type="text" required className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded text-sm focus:border-[#3cc720] outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Name</label>
                            <input type="text" required className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded text-sm focus:border-[#3cc720] outline-none" />
                        </div>
                    </div>

                    {/* Middle Row: Units & Pricing */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Unit Type</label>
                            <select className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded text-sm outline-none">
                                <option>Pieces</option>
                                <option>Box</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Purchase Price</label>
                            <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded text-sm outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Pkt Conversion</label>
                            <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded text-sm outline-none" placeholder="Pcs/Pkt" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Ctn Conversion</label>
                            <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded text-sm outline-none" placeholder="Pcs/Ctn" />
                        </div>
                    </div>

                    {/* Bottom Row: Company Logic */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Company Commission ($ Amt)</label>
                            <input type="number" className="w-full p-2.5 bg-white border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#3cc720]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Company Discount (%)</label>
                            <input type="number" className="w-full p-2.5 bg-white border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#3cc720]" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-bold uppercase text-gray-400 hover:text-gray-600">Cancel</button>
                        <button type="submit" className="px-10 py-2.5 bg-gray-900 text-white text-xs font-bold uppercase rounded-lg hover:bg-black transition-all">Save to Inventory</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductModal;