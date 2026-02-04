import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import useAxios from '../Hooks/UseAxios';

const CATEGORIES = [
    "BP", "GP", "SS", "OS", "File", "NB", "PF", "Chocolaate", "Chewing Gum",
    "Jelly Bar", "Wafter", "Dayline Bulb", "Dim Light", "Highlight Bulb",
    "Backup Bulb", "Backup Tube", "LED Tube Light", "GSS Goldliner",
    "GSS Aristo Gold", "Electric Tester", "Plug & Holder", "Piano Switch",
    "GSS White Gang", "Conduit Pipe", "Conduit Fittings"
];

const FormRow = ({ label, required, children }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div>{children}</div>
    </div>
);

const UpdateProductModal = ({ isOpen, onClose, product, onUpdateSuccess }) => {
    const axios = useAxios();

    // Initialize state directly from the prop. 
    // Because of the 'key' prop in the parent, this line runs fresh every time you open a new product.
    const [formData, setFormData] = useState(product);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter categories based on search input
    const filteredCategories = useMemo(() => {
        const search = formData?.category?.toLowerCase()?.trim() || '';
        if (!search) return CATEGORIES;
        return CATEGORIES.filter(cat => cat.toLowerCase().includes(search));
    }, [formData?.category]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen || !formData) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        const numericFields = [
            'company_commission', 'company_discount', 'pieces_per_packet',
            'pieces_per_cartoon', 'purchase_price', 'selling_price'
        ];

        setFormData(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? (value === '' ? '' : parseFloat(value)) : value
        }));

        if (name === 'category') setIsDropdownOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Strip out non-updatable fields
            const { _id, stock, stock_count, createdAt, ...updatePayload } = formData;

            // Ensure numeric consistency
            const numericFields = [
                'company_commission', 'company_discount', 'pieces_per_packet',
                'pieces_per_cartoon', 'purchase_price', 'selling_price'
            ];

            numericFields.forEach(field => {
                if (updatePayload[field] === '' || updatePayload[field] === undefined) {
                    updatePayload[field] = 0;
                }
            });

            const response = await axios.patch(`/products/update-product/${_id}`, updatePayload);

            if (response.status === 200) {
                Swal.fire({
                    title: 'Updated!',
                    text: 'Product information has been saved.',
                    icon: 'success',
                    confirmButtonColor: '#111827',
                });
                onUpdateSuccess();
                onClose();
            }
        } catch (err) {
            console.error("Update Error:", err);
            Swal.fire('Error', 'Could not update product details.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#111827]/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/30">
                    <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">
                        Edit <span className="text-blue-600">Product Info</span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <FormRow label="Product Name" required>
                        <input name="name" value={formData.name} onChange={handleChange} type="text" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none font-bold text-gray-700" />
                    </FormRow>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        <FormRow label="Product Code (Permanent)">
                            <input value={formData.code} disabled className="w-full p-2 bg-gray-100 border border-gray-200 rounded text-sm outline-none font-semibold text-gray-400 cursor-not-allowed italic" />
                        </FormRow>

                        <FormRow label="Product ID (Permanent)">
                            <input value={formData.product_id} disabled className="w-full p-2 bg-gray-100 border border-gray-200 rounded text-sm outline-none font-semibold text-gray-400 cursor-not-allowed italic" />
                        </FormRow>

                        <FormRow label="Category" required>
                            <div className="relative" ref={dropdownRef}>
                                <div className="relative flex items-center">
                                    <input
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        autoComplete="off"
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none font-bold"
                                    />
                                    <ChevronDown size={14} className="absolute right-2 text-gray-400" />
                                </div>
                                {isDropdownOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden">
                                        <div className="max-h-32 overflow-y-auto">
                                            {filteredCategories.map((cat) => (
                                                <div
                                                    key={cat}
                                                    className="px-3 py-2 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 cursor-pointer flex items-center justify-between"
                                                    onClick={() => {
                                                        setFormData({ ...formData, category: cat });
                                                        setIsDropdownOpen(false);
                                                    }}
                                                >
                                                    {cat} {formData.category === cat && <Check size={12} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </FormRow>

                        <FormRow label="Unit Type" required>
                            <select name="unit_type" value={formData.unit_type} onChange={handleChange} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none font-bold">
                                <option value="pieces">Pieces</option>
                                <option value="box">Box</option>
                                <option value="pkt">Packet</option>
                            </select>
                        </FormRow>

                        <FormRow label="Purchase Price (৳)" required>
                            <input name="purchase_price" value={formData.purchase_price} onChange={handleChange} type="number" step="0.01" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 font-bold text-blue-700" />
                        </FormRow>

                        <FormRow label="Selling Price (৳)" required>
                            <input name="selling_price" value={formData.selling_price} onChange={handleChange} type="number" step="0.01" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 font-bold text-green-600" />
                        </FormRow>

                        <FormRow label="Pcs / Packet">
                            <input name="pieces_per_packet" value={formData.pieces_per_packet} onChange={handleChange} type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm font-bold" />
                        </FormRow>

                        <FormRow label="Pcs / Carton">
                            <input name="pieces_per_cartoon" value={formData.pieces_per_cartoon} onChange={handleChange} type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm font-bold" />
                        </FormRow>

                        <FormRow label="Dealer Commission (৳)">
                            <input name="company_commission" value={formData.company_commission} onChange={handleChange} type="number" step="0.01" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm font-bold focus:border-blue-500" />
                        </FormRow>

                        <FormRow label="Company Discount (%)">
                            <input name="company_discount" value={formData.company_discount} onChange={handleChange} type="number" step="0.1" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm font-bold focus:border-blue-500" />
                        </FormRow>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-[10px] font-black uppercase text-gray-400 hover:text-red-500 tracking-widest transition-colors">Discard Changes</button>
                        <button type="submit" className="px-10 py-2.5 bg-[#111827] text-blue-500 text-[10px] font-black uppercase rounded shadow-lg hover:bg-black border border-blue-500/30 transition-all tracking-[0.15em]">
                            Update Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateProductModal;