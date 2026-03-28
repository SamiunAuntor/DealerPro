import React, { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Eye, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import useAxios from "../Hooks/UseAxios";
import SaleInvoiceDetailsModal from "../Componenets/SaleInvoiceDetailsModal";
import ReturnSaleModal from "../Componenets/ReturnSaleModal";
import { formatCurrency } from "../utils/unitConversion";

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

function SalesHistoryPage() {
    const axios = useAxios();
    const [selectedSale, setSelectedSale] = useState(null);
    const [saleToReturn, setSaleToReturn] = useState(null);
    const [historyFilters, setHistoryFilters] = useState({
        customer_id: "",
        channel: "",
        from: "",
        to: "",
    });

    const customersQuery = useQuery({
        queryKey: ["customers", "sales-history-options"],
        queryFn: async () => {
            const [customersResponse, walkInResponse] = await Promise.all([
                axios.get("/customers"),
                axios.get("/customers/walk-in"),
            ]);

            return {
                customers: customersResponse.data,
                walkInCustomer: walkInResponse.data,
            };
        },
    });

    const salesQuery = useQuery({
        queryKey: ["sales", historyFilters],
        queryFn: async () => {
            const response = await axios.get("/sales", { params: historyFilters });
            return response.data;
        },
    });

    const customerOptions = useMemo(() => {
        const regularCustomers = customersQuery.data?.customers || [];
        const walkInCustomer = customersQuery.data?.walkInCustomer;

        return walkInCustomer ? [walkInCustomer, ...regularCustomers] : regularCustomers;
    }, [customersQuery.data]);

    const getReturnStatusLabel = (status) => {
        if (status === "fully_returned") {
            return "Full";
        }

        if (status === "partially_returned") {
            return "Partial";
        }

        return "Not Returned";
    };

    const getReturnStatusClassName = (status) => {
        if (status === "fully_returned") {
            return "bg-red-50 text-red-600";
        }

        if (status === "partially_returned") {
            return "bg-amber-50 text-amber-600";
        }

        return "bg-gray-100 text-gray-600";
    };

    const getDisplayCustomerName = (name) =>
        name === "Walk-in Customer" ? "Anonymous Customer" : name;
    const salesRows = salesQuery.data || [];

    const handleDownloadSalesReport = () => {
        if (salesRows.length === 0) {
            Swal.fire("No Data", "There are no sales to include in the report.", "info");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 14;
        const usableWidth = pageWidth - marginX * 2;
        let y = 18;

        const ensureSpace = (requiredHeight = 10) => {
            if (y + requiredHeight <= pageHeight - 14) {
                return;
            }

            doc.addPage();
            y = 18;
        };

        const addSummaryLine = (label, value = "") => {
            ensureSpace(8);
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, marginX, y);
            doc.setFont("helvetica", "normal");
            doc.text(String(value), 62, y);
            y += 7;
        };

        const drawTable = (title, columns, rows) => {
            ensureSpace(18);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(title, marginX, y);
            y += 6;

            const headerHeight = 8;
            const lineHeight = 6;
            const totalRequestedWidth = columns.reduce((sum, column) => sum + column.width, 0);
            const normalizedColumns = columns.map((column) => ({
                ...column,
                width: (column.width / totalRequestedWidth) * usableWidth,
            }));

            const drawHeader = () => {
                doc.setFillColor(243, 244, 246);
                doc.rect(marginX, y, usableWidth, headerHeight, "F");
                doc.setDrawColor(220, 224, 230);
                doc.rect(marginX, y, usableWidth, headerHeight);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);

                let x = marginX;
                normalizedColumns.forEach((column) => {
                    doc.text(column.header, x + 2, y + 5.2);
                    x += column.width;
                });

                y += headerHeight;
            };

            drawHeader();

            rows.forEach((row) => {
                const cellLines = normalizedColumns.map((column) =>
                    doc.splitTextToSize(String(row[column.key] ?? "-"), column.width - 4)
                );
                const rowHeight =
                    Math.max(...cellLines.map((lines) => lines.length), 1) * lineHeight + 2;

                ensureSpace(rowHeight + 2);

                if (y + rowHeight > pageHeight - 14) {
                    doc.addPage();
                    y = 18;
                    drawHeader();
                }

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                let x = marginX;

                normalizedColumns.forEach((column, index) => {
                    doc.rect(x, y, column.width, rowHeight);
                    doc.text(cellLines[index], x + 2, y + 5);
                    x += column.width;
                });

                y += rowHeight;
            });
        };

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Sales History Report", marginX, y);
        y += 10;

        doc.setFontSize(10);
        addSummaryLine("Generated At", formatDateTime(new Date()));
        addSummaryLine("Total Rows", salesRows.length);
        addSummaryLine("From", historyFilters.from || "All Time");
        addSummaryLine("To", historyFilters.to || "Now");
        addSummaryLine("Channel", historyFilters.channel || "All channels");

        const selectedCustomerOption = customerOptions.find(
            (customer) => customer._id === historyFilters.customer_id
        );
        addSummaryLine(
            "Customer",
            historyFilters.customer_id
                ? getDisplayCustomerName(selectedCustomerOption?.name)
                : "All customers"
        );

        y += 2;

        drawTable(
            "Sales History",
            [
                { header: "Invoice", key: "invoice_number", width: 34 },
                { header: "Customer", key: "customer_name", width: 28 },
                { header: "Channel", key: "channel", width: 18 },
                { header: "Amount", key: "total_amount", width: 22 },
                { header: "Profit/Loss", key: "profit_loss", width: 24 },
                { header: "Return", key: "return_status", width: 22 },
                { header: "Created", key: "created_at", width: 32 },
            ],
            salesRows.map((sale) => ({
                invoice_number: sale.invoice_number,
                customer_name: getDisplayCustomerName(sale.customer_snapshot?.name),
                channel: sale.channel,
                total_amount: formatCurrency(sale.total_amount),
                profit_loss: formatCurrency(sale.profit_loss),
                return_status: getReturnStatusLabel(sale.return_status),
                created_at: formatDateTime(sale.created_at),
            }))
        );

        doc.save("sales-history-report.pdf");
    };

    return (
        <div className="flex min-h-full w-full flex-col gap-4 bg-white p-3 pb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
                    <div className="self-start text-left">
                        <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">
                            Sales History
                        </h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Immutable invoices and quick lookup
                        </p>
                    </div>

                    <div className="flex w-full flex-col gap-2 xl:w-auto">
                        <div className="grid w-full gap-2 md:grid-cols-2 xl:grid-cols-4">
                            <input
                                className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                                onChange={(event) =>
                                    setHistoryFilters((prev) => ({ ...prev, from: event.target.value }))
                                }
                                type="date"
                                value={historyFilters.from}
                            />
                            <input
                                className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                                onChange={(event) =>
                                    setHistoryFilters((prev) => ({ ...prev, to: event.target.value }))
                                }
                                type="date"
                                value={historyFilters.to}
                            />
                            <select
                                className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                                onChange={(event) =>
                                    setHistoryFilters((prev) => ({ ...prev, channel: event.target.value }))
                                }
                                value={historyFilters.channel}
                            >
                                <option value="">All channels</option>
                                <option value="pos">POS</option>
                                <option value="customer">Customer</option>
                            </select>
                            <select
                                className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                                onChange={(event) =>
                                    setHistoryFilters((prev) => ({ ...prev, customer_id: event.target.value }))
                                }
                                value={historyFilters.customer_id}
                            >
                                <option value="">All customers</option>
                                {customerOptions.map((customer) => (
                                    <option key={customer._id} value={customer._id}>
                                        {customer.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-start pt-1 xl:justify-end xl:pb-0">
                            <button
                                className="rounded bg-[#111827] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#3cc720] transition hover:bg-black"
                                onClick={handleDownloadSalesReport}
                                type="button"
                            >
                                Download Sales Report
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-1 overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-[920px] w-full table-fixed border-collapse text-left">
                        <thead className="border-b border-gray-200 bg-gray-100">
                            <tr className="divide-x divide-gray-200">
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Invoice
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Customer
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Channel
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Amount
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Profit / Loss
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Return
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Created
                                </th>
                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {salesQuery.isLoading && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={8}>
                                        Loading sales...
                                    </td>
                                </tr>
                            )}
                            {!salesQuery.isLoading && (salesQuery.data || []).length === 0 && (
                                <tr>
                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={8}>
                                        No sales found for the selected filters.
                                    </td>
                                </tr>
                            )}
                            {(salesQuery.data || []).map((sale) => (
                                <tr key={sale._id} className="divide-x divide-gray-200">
                                    <td className="px-3 py-2 text-center text-xs font-semibold text-gray-800">
                                        {sale.invoice_number}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-700">
                                        {getDisplayCustomerName(sale.customer_snapshot?.name)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm capitalize text-gray-700">
                                        {sale.channel}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">
                                        {formatCurrency(sale.total_amount)}
                                    </td>
                                    <td
                                        className={`px-3 py-2 text-center text-sm font-semibold ${
                                            sale.profit_loss < 0 ? "text-red-600" : "text-emerald-600"
                                        }`}
                                    >
                                        {formatCurrency(sale.profit_loss)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getReturnStatusClassName(
                                                sale.return_status
                                            )}`}
                                        >
                                            {getReturnStatusLabel(sale.return_status)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                        {formatDateTime(sale.created_at)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                className="p-1 text-blue-500"
                                                onClick={() => setSelectedSale(sale)}
                                                type="button"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="p-1 text-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                                                disabled={sale.return_status === "fully_returned"}
                                                onClick={() => setSaleToReturn(sale)}
                                                type="button"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <SaleInvoiceDetailsModal
                isOpen={Boolean(selectedSale)}
                onClose={() => setSelectedSale(null)}
                sale={selectedSale}
            />
            {saleToReturn && (
                <ReturnSaleModal
                    key={saleToReturn._id}
                    isOpen={Boolean(saleToReturn)}
                    onClose={() => setSaleToReturn(null)}
                    sale={saleToReturn}
                />
            )}
        </div>
    );
}

export default SalesHistoryPage;
