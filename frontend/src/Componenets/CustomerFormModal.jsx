import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const INITIAL_FORM_DATA = {
    name: "",
    phone: "",
};

function CustomerFormModal({
    isOpen,
    title,
    submitLabel,
    initialValues = INITIAL_FORM_DATA,
    isSubmitting,
    onClose,
    onSubmit,
}) {
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: initialValues?.name || "",
                phone: initialValues?.phone || "",
            });
        }
    }, [initialValues, isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 p-4">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-[#111827]">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                        type="button"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Customer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm font-semibold text-gray-700 outline-none focus:border-[#3cc720]"
                            name="name"
                            onChange={handleChange}
                            placeholder="Enter customer name"
                            required
                            type="text"
                            value={formData.name}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm font-semibold text-gray-700 outline-none focus:border-[#3cc720]"
                            name="phone"
                            onChange={handleChange}
                            placeholder="Enter phone number"
                            required
                            type="text"
                            value={formData.phone}
                        />
                    </div>

                    <div className="flex justify-end border-t border-gray-100 pt-4">
                        <button
                            className="rounded bg-[#111827] px-10 py-2.5 text-[10px] font-black uppercase text-[#3cc720] shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? "Processing..." : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CustomerFormModal;
