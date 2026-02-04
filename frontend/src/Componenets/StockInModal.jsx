import React, { useState } from 'react';
import { X } from 'lucide-react';
import useAxios from '../Hooks/UseAxios';
import Swal from 'sweetalert2';

const StockInModal = ({ isOpen, onClose, product, onUpdateSuccess }) => {
    const [quantity, setQuantity] = useState('');
    const [loading, setLoading] = useState(false);
    const axios = useAxios();

    if (!isOpen || !product) return null;

    const handleStockIn = async () => {
        if (!quantity || quantity <= 0) {
            Swal.fire('Error', 'Please enter a valid quantity', 'error');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`/products/stock-in/${product._id}`, {
                quantity: parseInt(quantity),
            });

            Swal.fire({
                icon: 'success',
                title: 'Stock Updated',
                text: `${quantity} pieces added to ${product.code}`,
                timer: 1500,
                showConfirmButton: false
            });

            setQuantity('');
            onUpdateSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to update stock', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            {/* Modal Container: Removed heavy borders and dark backgrounds */}
            <div className="bg-white w-11/12 max-w-md rounded-lg shadow-xl overflow-hidden">

                {/* Header: Simplified with just Title and Close */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-slate-800">Add Stock</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content: Left Aligned and Structured */}
                <div className="p-6 space-y-4">
                    <div className="text-left">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Name</label>
                        <p className="text-base font-semibold text-slate-800 uppercase">{product.name}</p>
                    </div>

                    <div className="flex gap-10">
                        <div className="text-left">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Code</label>
                            <p className="text-sm font-medium text-slate-600">{product.code}</p>
                        </div>
                        <div className="text-left">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">In Stock</label>
                            <p className="text-sm font-bold text-blue-600">{product.stock_count} Pieces</p>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    <div className="text-left pt-2">
                        <label className="block text-xs font-bold text-slate-700 mb-2">New Add Stock Quantity</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-800/10 focus: text-sm transition-all"
                        />
                    </div>
                </div>

                {/* Footer: Single Action Button */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                    <button
                        disabled={loading}
                        onClick={handleStockIn}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded text-xs transition-all disabled:opacity-50"
                    >
                        {loading ? 'PROCESSING...' : 'ADD STOCK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockInModal;