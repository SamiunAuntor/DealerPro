import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import useAxios from '../Hooks/UseAxios';
import { useMutation } from '@tanstack/react-query';


// 1. CONSTANTS DECLARED OUTSIDE
const CATEGORIES = [
    "BP", "GP", "SS", "OS", "File", "NB", "PF", "Chocolaate", "Chewing Gum",
    "Jelly Bar", "Wafter", "Dayline Bulb", "Dim Light", "Highlight Bulb",
    "Backup Bulb", "Backup Tube", "LED Tube Light", "GSS Goldliner",
    "GSS Aristo Gold", "Electric Tester", "Plug & Holder", "Piano Switch",
    "GSS White Gang", "Conduit Pipe", "Conduit Fittings"
];

const INITIAL_STATE = {
    code: '',
    product_id: '',
    category: '',
    name: '',
    company_commission: 0,
    company_discount: 0,
    unit_type: 'pieces',
    pieces_per_packet: 0,
    pieces_per_cartoon: 0,
    purchase_price: 0,
    selling_price: 0,
};

// 2. COMPONENT DECLARED OUTSIDE
const FormRow = ({ label, required, children }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div>{children}</div>
    </div>
);

const AddProductModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const axios = useAxios();

    const filteredCategories = useMemo(() => {
        const search = formData.category.toLowerCase().trim();
        if (!search) return CATEGORIES;
        return CATEGORIES.filter(cat => cat.toLowerCase().includes(search));
    }, [formData.category]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const handleChange = (e) => {
        const { name, value } = e.target;
        const numericFields = ['company_commission', 'company_discount', 'pieces_per_packet', 'pieces_per_cartoon', 'purchase_price', 'selling_price'];

        setFormData(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? (value === '' ? '' : parseFloat(value)) : value
        }));

        if (name === 'category') setIsDropdownOpen(true);
    };


    const addProductMutation = useMutation({
        mutationFn: (productData) => axios.post('/product', productData),

        onSuccess: () => {
            Swal.fire({
                title: 'Success!',
                text: 'Product Registered Successfully',
                icon: 'success',
                confirmButtonColor: '#111827',
            });

            setFormData(INITIAL_STATE);
            onClose();
        },

        onError: (error) => {
            console.error(error);
            Swal.fire(
                'Error',
                error.response?.data?.message || 'Failed to register product',
                'error'
            );
        }
    });

    if (!isOpen) return null;



    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.category) {
            Swal.fire('Error', 'Please select or type a category', 'error');
            return;
        }

        addProductMutation.mutate(formData);
    };


    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#111827]/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/30">
                    <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">
                        Add <span className="text-[#3cc720]">Product</span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <FormRow label="Product Name" required>
                        <input name="name" value={formData.name} onChange={handleChange} type="text" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-[#3cc720] outline-none font-bold text-gray-700 placeholder:font-normal" placeholder="Enter product name..." />
                    </FormRow>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        <FormRow label="Product Code" required>
                            <input name="code" value={formData.code} onChange={handleChange} type="text" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-[#3cc720] outline-none font-semibold" placeholder="SKU-001" />
                        </FormRow>

                        <FormRow label="Product ID" required>
                            <input name="product_id" value={formData.product_id} onChange={handleChange} type="text" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-[#3cc720] outline-none font-semibold" placeholder="PID-1234" />
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
                                        placeholder="Type or select..."
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-[#3cc720] outline-none font-bold"
                                    />
                                    <ChevronDown size={14} className={`absolute right-2 text-gray-400 pointer-events-none transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {isDropdownOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden">
                                        <div className="max-h-32 overflow-y-auto">
                                            {filteredCategories.length > 0 ? filteredCategories.map((cat) => (
                                                <div
                                                    key={cat}
                                                    className="px-3 py-2 text-xs font-bold hover:bg-[#3cc720]/10 hover:text-[#3cc720] cursor-pointer flex items-center justify-between"
                                                    onClick={() => {
                                                        setFormData({ ...formData, category: cat });
                                                        setIsDropdownOpen(false);
                                                    }}
                                                >
                                                    {cat}
                                                    {formData.category === cat && <Check size={12} />}
                                                </div>
                                            )) : (
                                                <div className="p-3 text-[10px] text-gray-400 uppercase italic">No matches found</div>
                                            )}
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
                            <input name="purchase_price" value={formData.purchase_price} onChange={handleChange} type="number" step="0.01" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-[#3cc720] font-bold text-blue-600" />
                        </FormRow>

                        <FormRow label="Selling Price (৳)" required>
                            <input name="selling_price" value={formData.selling_price} onChange={handleChange} type="number" step="0.01" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-[#3cc720] font-bold text-green-600" />
                        </FormRow>

                        <FormRow label="Pcs / Packet">
                            <input name="pieces_per_packet" value={formData.pieces_per_packet} onChange={handleChange} type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none font-bold" />
                        </FormRow>

                        <FormRow label="Pcs / Carton">
                            <input name="pieces_per_cartoon" value={formData.pieces_per_cartoon} onChange={handleChange} type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none font-bold" />
                        </FormRow>

                        <FormRow label="Dealer Commission (৳)">
                            <input name="company_commission" value={formData.company_commission} onChange={handleChange} type="number" step="0.01" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none font-bold focus:border-[#3cc720]" />
                        </FormRow>

                        <FormRow label="Company Discount (%)">
                            <input name="company_discount" value={formData.company_discount} onChange={handleChange} type="number" step="0.1" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none font-bold focus:border-[#3cc720]" />
                        </FormRow>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                        <button type="submit" className="px-10 py-2.5 bg-[#111827] text-[#3cc720] text-[10px] font-black uppercase rounded shadow-lg ">
                            Add Product
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductModal;