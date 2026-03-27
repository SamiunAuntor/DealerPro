import React, { useMemo, useState } from "react";
import { Edit3, Plus, Search, Trash2, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import useAxios from "../Hooks/UseAxios";
import CustomerFormModal from "../Componenets/CustomerFormModal";

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function CustomersPage() {
    const axios = useAxios();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const customersQuery = useQuery({
        queryKey: ["customers"],
        queryFn: async () => {
            const response = await axios.get("/customers");
            return response.data;
        },
    });

    const addCustomerMutation = useMutation({
        mutationFn: (payload) => axios.post("/customers", payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["customers"] });
            setIsAddModalOpen(false);
            Swal.fire("Success", "Customer added successfully.", "success");
        },
        onError: (error) => {
            Swal.fire("Error", error.response?.data?.message || "Failed to add customer.", "error");
        },
    });

    const updateCustomerMutation = useMutation({
        mutationFn: ({ id, payload }) => axios.patch(`/customers/${id}`, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["customers"] });
            setEditingCustomer(null);
            Swal.fire("Success", "Customer updated successfully.", "success");
        },
        onError: (error) => {
            Swal.fire("Error", error.response?.data?.message || "Failed to update customer.", "error");
        },
    });

    const deleteCustomerMutation = useMutation({
        mutationFn: (id) => axios.delete(`/customers/${id}`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["customers"] });
            Swal.fire("Deleted", "Customer removed successfully.", "success");
        },
        onError: (error) => {
            Swal.fire("Error", error.response?.data?.message || "Failed to delete customer.", "error");
        },
    });

    const filteredCustomers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return customersQuery.data || [];
        }

        return (customersQuery.data || []).filter((customer) => {
            return (
                customer.name.toLowerCase().includes(normalizedSearch) ||
                customer.phone.toLowerCase().includes(normalizedSearch)
            );
        });
    }, [customersQuery.data, searchTerm]);

    const handleDelete = async (customer) => {
        const result = await Swal.fire({
            title: `Delete "${customer.name}"?`,
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, delete it",
            cancelButtonText: "Cancel",
        });

        if (result.isConfirmed) {
            deleteCustomerMutation.mutate(customer._id);
        }
    };

    return (
        <div className="flex h-full w-full flex-col bg-white px-2 py-2">
            <div className="mb-3 flex flex-col items-start justify-between gap-3 px-1 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#3cc720]" />
                    <h1 className="text-lg font-bold tracking-tight text-gray-800">Customer Directory</h1>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            className="w-full rounded border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none sm:w-64"
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search by name or phone..."
                            type="text"
                            value={searchTerm}
                        />
                    </div>
                    <button
                        className="flex shrink-0 items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-slate-900"
                        onClick={() => setIsAddModalOpen(true)}
                        type="button"
                    >
                        <Plus size={14} />
                        <span>Add Customer</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden rounded border border-gray-200">
                <div className="h-full overflow-x-auto">
                    <table className="min-w-[760px] w-full table-fixed border-collapse text-left lg:min-w-full">
                        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100">
                            <tr className="divide-x divide-gray-200">
                                <th className="w-[240px] px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Name</th>
                                <th className="w-[180px] px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Phone</th>
                                <th className="w-[160px] px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Created</th>
                                <th className="w-[160px] px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Updated</th>
                                <th className="w-[120px] px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {customersQuery.isLoading && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={5}>
                                        Loading customers...
                                    </td>
                                </tr>
                            )}

                            {customersQuery.isError && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-red-500" colSpan={5}>
                                        Failed to load customers.
                                    </td>
                                </tr>
                            )}

                            {!customersQuery.isLoading && !customersQuery.isError && filteredCustomers.length === 0 && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={5}>
                                        No customers found.
                                    </td>
                                </tr>
                            )}

                            {filteredCustomers.map((customer) => (
                                <tr key={customer._id} className="divide-x divide-gray-200 transition-colors hover:bg-gray-100">
                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">{customer.name}</td>
                                    <td className="px-3 py-2 text-center text-sm font-medium text-gray-600">{customer.phone}</td>
                                    <td className="px-3 py-2 text-center text-xs text-gray-500">{formatDateTime(customer.created_at)}</td>
                                    <td className="px-3 py-2 text-center text-xs text-gray-500">{formatDateTime(customer.updated_at)}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                className="p-1 text-blue-500"
                                                onClick={() => setEditingCustomer(customer)}
                                                type="button"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                className="p-1 text-red-500"
                                                disabled={deleteCustomerMutation.isPending}
                                                onClick={() => handleDelete(customer)}
                                                type="button"
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

            <div className="mt-2 px-1 text-[10px] font-medium italic text-gray-400">
                Showing {filteredCustomers.length} entries
            </div>

            <CustomerFormModal
                initialValues={{ name: "", phone: "" }}
                isOpen={isAddModalOpen}
                isSubmitting={addCustomerMutation.isPending}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={(payload) => addCustomerMutation.mutate(payload)}
                submitLabel="Add Customer"
                title="Add Customer"
            />

            <CustomerFormModal
                initialValues={editingCustomer}
                isOpen={Boolean(editingCustomer)}
                isSubmitting={updateCustomerMutation.isPending}
                onClose={() => setEditingCustomer(null)}
                onSubmit={(payload) =>
                    updateCustomerMutation.mutate({
                        id: editingCustomer._id,
                        payload,
                    })
                }
                submitLabel="Update Customer"
                title="Edit Customer"
            />
        </div>
    );
}

export default CustomersPage;
