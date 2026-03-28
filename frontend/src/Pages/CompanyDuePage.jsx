import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";
import useAxios from "../Hooks/UseAxios";
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

function CompanyDuePage() {
    const axios = useAxios();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("breakdown");
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [selectedSettlementSaleId, setSelectedSettlementSaleId] = useState("");
    const [settlementNote, setSettlementNote] = useState("");
    const [filters, setFilters] = useState({
        customer_id: "",
        channel: "",
        from: "",
        to: "",
    });

    const customersQuery = useQuery({
        queryKey: ["customers", "company-due-options"],
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

    const companyDueQuery = useQuery({
        queryKey: ["sales", "company-due", filters],
        queryFn: async () => {
            const response = await axios.get("/sales/company-due", { params: filters });
            return response.data;
        },
    });

    const customerOptions = [
        ...(customersQuery.data?.walkInCustomer ? [customersQuery.data.walkInCustomer] : []),
        ...(customersQuery.data?.customers || []),
    ];
    const hasActiveFilters = useMemo(
        () => Object.values(filters).some((value) => String(value || "").trim() !== ""),
        [filters]
    );

    const summary = companyDueQuery.data?.summary || {
        gross_company_commission: 0,
        refunded_company_commission: 0,
        total_company_commission: 0,
        total_sales_count: 0,
        total_products_count: 0,
        total_quantity_pieces: 0,
        contributing_products_count: 0,
        last_settlement: null,
    };

    const productRows = companyDueQuery.data?.by_product || [];
    const recentSales = companyDueQuery.data?.recent_sales || [];
    const settlementOptions = companyDueQuery.data?.settlement_options || [];
    const settlements = companyDueQuery.data?.settlements || [];
    const getDisplayCustomerName = (name) =>
        name === "Walk-in Customer" ? "Anonymous Customer" : name;
    const selectedSettlementSale =
        settlementOptions.find((sale) => sale._id === selectedSettlementSaleId) || settlementOptions[0] || null;

    const createSettlementMutation = useMutation({
        mutationFn: (payload) => axios.post("/sales/company-due/settlements", payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sales", "company-due"] });
            setIsSettlementModalOpen(false);
            setSelectedSettlementSaleId("");
            setSettlementNote("");
            Swal.fire("Success", "Company due marked as collected.", "success");
        },
        onError: (error) => {
            Swal.fire(
                "Error",
                error.response?.data?.message || "Failed to create settlement.",
                "error"
            );
        },
    });

    const handleCreateSettlement = async () => {
        if (hasActiveFilters) {
            Swal.fire(
                "Filters Active",
                "Clear the current filters before creating a company due settlement.",
                "warning"
            );
            return;
        }

        if (summary.total_company_commission <= 0) {
            Swal.fire("Nothing To Settle", "There is no outstanding company due right now.", "info");
            return;
        }

        setSelectedSettlementSaleId(settlementOptions[0]?._id || "");
        setSettlementNote("");
        setIsSettlementModalOpen(true);
    };

    const handleConfirmSettlement = () => {
        if (!selectedSettlementSale) {
            Swal.fire("Selection Required", "Please select the last invoice to settle through.", "warning");
            return;
        }

        createSettlementMutation.mutate({
            cutoff_sale_id: selectedSettlementSale._id,
            note: settlementNote,
        });
    };

    const handleDownloadSettlementReport = async (settlement) => {
        try {
            const response = await axios.get(`/sales/company-due/settlements/${settlement._id}/report`);
            const report = response.data;
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
                doc.text(String(value), 70, y);
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

                if (rows.length === 0) {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.rect(marginX, y, usableWidth, 10);
                    doc.text("No data available", marginX + 2, y + 6);
                    y += 12;
                    return;
                }

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

                y += 6;
            };

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Company Due Settlement Report", marginX, y);
            y += 10;

            doc.setFontSize(10);
            addSummaryLine("Settled At", formatDateTime(report.settlement.settled_at));
            addSummaryLine("Covered Through", report.settlement.cutoff_invoice_number);
            addSummaryLine("Gross Commission", formatCurrency(report.settlement.gross_company_commission));
            addSummaryLine("Refunded Commission", formatCurrency(report.settlement.refunded_company_commission));
            addSummaryLine("Net Settled Amount", formatCurrency(report.settlement.net_settled_amount));
            addSummaryLine("Sales Count", report.settlement.sales_count);
            addSummaryLine("Returns Count", report.settlement.returns_count);
            addSummaryLine("Note", report.settlement.note || "-");

            y += 2;

            drawTable(
                "Outstanding Commission Breakdown",
                [
                    { header: "Product", key: "product_name", width: 40 },
                    { header: "Code", key: "product_code", width: 24 },
                    { header: "Comm/Piece", key: "company_commission_per_piece", width: 28 },
                    { header: "Pieces", key: "total_quantity_pieces", width: 20 },
                    { header: "Gross", key: "gross_company_commission", width: 26 },
                    { header: "Refunded", key: "refunded_company_commission", width: 26 },
                    { header: "Claimable", key: "total_company_commission", width: 26 },
                ],
                report.by_product.map((row) => ({
                    product_name: row.product_name,
                    product_code: row.product_code,
                    company_commission_per_piece: formatCurrency(row.company_commission_per_piece),
                    total_quantity_pieces: row.total_quantity_pieces,
                    gross_company_commission: formatCurrency(row.gross_company_commission),
                    refunded_company_commission: formatCurrency(row.refunded_company_commission),
                    total_company_commission: formatCurrency(row.total_company_commission),
                }))
            );

            drawTable(
                "Included Sales",
                [
                    { header: "Invoice", key: "invoice_number", width: 42 },
                    { header: "Customer", key: "customer_name", width: 34 },
                    { header: "Created", key: "created_at", width: 40 },
                    { header: "Amount", key: "total_amount", width: 28 },
                    { header: "Commission", key: "total_company_commission", width: 36 },
                ],
                report.included_sales.map((sale) => ({
                    invoice_number: sale.invoice_number,
                    customer_name: getDisplayCustomerName(sale.customer_snapshot?.name),
                    created_at: formatDateTime(sale.created_at),
                    total_amount: formatCurrency(sale.total_amount),
                    total_company_commission: formatCurrency(sale.total_company_commission),
                }))
            );

            drawTable(
                "Included Returns",
                [
                    { header: "Return", key: "return_number", width: 36 },
                    { header: "Sale", key: "original_invoice_number", width: 42 },
                    { header: "Created", key: "created_at", width: 38 },
                    { header: "Refund", key: "total_amount_refunded", width: 28 },
                    { header: "Commission Reversed", key: "total_company_commission_refunded", width: 46 },
                ],
                report.included_returns.map((returnRecord) => ({
                    return_number: returnRecord.return_number,
                    original_invoice_number: returnRecord.original_invoice_number,
                    created_at: formatDateTime(returnRecord.created_at),
                    total_amount_refunded: formatCurrency(returnRecord.total_amount_refunded),
                    total_company_commission_refunded: formatCurrency(
                        returnRecord.total_company_commission_refunded
                    ),
                }))
            );

            doc.save(`company-due-settlement-${report.settlement.cutoff_invoice_number}.pdf`);
        } catch (error) {
            Swal.fire(
                "Error",
                error.response?.data?.message || "Failed to download settlement report.",
                "error"
            );
        }
    };

    return (
        <div className="flex min-h-full w-full flex-col gap-4 bg-white p-3 pb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    <div className="text-left">
                        <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">
                            Company Due
                        </h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Outstanding claimable commission after the latest settlement
                        </p>
                    </div>

                    <div className="grid w-full gap-2 md:w-auto md:grid-cols-4">
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, from: event.target.value }))
                            }
                            type="date"
                            value={filters.from}
                        />
                        <input
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, to: event.target.value }))
                            }
                            type="date"
                            value={filters.to}
                        />
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, channel: event.target.value }))
                            }
                            value={filters.channel}
                        >
                            <option value="">All channels</option>
                            <option value="pos">POS</option>
                            <option value="customer">Customer</option>
                        </select>
                        <select
                            className="rounded border border-gray-200 bg-gray-50 p-2 text-xs font-semibold outline-none focus:border-[#3cc720]"
                            onChange={(event) =>
                                setFilters((prev) => ({ ...prev, customer_id: event.target.value }))
                            }
                            value={filters.customer_id}
                        >
                            <option value="">All customers</option>
                            {customerOptions.map((customer) => (
                                <option key={customer._id} value={customer._id}>
                                    {customer.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        {summary.last_settlement
                            ? `Last settled ${formatDateTime(summary.last_settlement.settled_at)} | ${summary.last_settlement.cutoff_invoice_number}`
                            : "No company due settlement recorded yet"}
                    </div>
                    <button
                        className="rounded bg-[#111827] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#3cc720] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                            createSettlementMutation.isPending ||
                            hasActiveFilters ||
                            summary.total_company_commission <= 0
                        }
                        onClick={handleCreateSettlement}
                        type="button"
                    >
                        {createSettlementMutation.isPending ? "Processing..." : "Mark As Collected"}
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Outstanding Due
                        </p>
                        <p className="mt-2 text-2xl font-black text-gray-900">
                            {formatCurrency(summary.total_company_commission)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Gross Commission
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {formatCurrency(summary.gross_company_commission)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Refunded Commission
                        </p>
                        <p className="mt-2 text-xl font-semibold text-red-600">
                            {formatCurrency(summary.refunded_company_commission)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Sales Count
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {summary.total_sales_count}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Product Lines
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {summary.total_products_count}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Products Due
                        </p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                            {summary.contributing_products_count}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-left">
                        <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                            {activeTab === "breakdown"
                                ? "Outstanding Commission Breakdown"
                                : activeTab === "sales"
                                  ? "Outstanding Contributing Sales"
                                  : "Settlement History"}
                        </h2>
                    </div>

                    <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
                        <button
                            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition ${
                                activeTab === "breakdown"
                                    ? "bg-[#111827] text-[#3cc720]"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                            onClick={() => setActiveTab("breakdown")}
                            type="button"
                        >
                            Breakdown
                        </button>
                        <button
                            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition ${
                                activeTab === "sales"
                                    ? "bg-[#111827] text-[#3cc720]"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                            onClick={() => setActiveTab("sales")}
                            type="button"
                        >
                            Recent Sales
                        </button>
                        <button
                            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition ${
                                activeTab === "settlements"
                                    ? "bg-[#111827] text-[#3cc720]"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                            onClick={() => setActiveTab("settlements")}
                            type="button"
                        >
                            Settlements
                        </button>
                    </div>
                </div>

                {activeTab === "breakdown" ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-[920px] w-full table-fixed border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-100">
                                <tr className="divide-x divide-gray-200">
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Product
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Code
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Comm./Piece
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Pieces
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Sales Lines
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Refunded
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Claimable
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {companyDueQuery.isLoading && (
                                    <tr>
                                        <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={7}>
                                            Loading company due summary...
                                        </td>
                                    </tr>
                                )}
                                {!companyDueQuery.isLoading && productRows.length === 0 && (
                                    <tr>
                                        <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={7}>
                                            No claimable company commission found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                                {productRows.map((row) => (
                                    <tr key={String(row._id)} className="divide-x divide-gray-200">
                                        <td className="px-3 py-2 text-sm font-semibold text-gray-800">
                                            {row.product_name}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {row.product_code}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {formatCurrency(row.company_commission_per_piece)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {row.total_quantity_pieces}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {row.total_sales_count}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm font-semibold text-red-600">
                                            {formatCurrency(row.refunded_company_commission)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                                            {formatCurrency(row.total_company_commission)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === "sales" ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                                        Sale Amount
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Commission
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Created
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {companyDueQuery.isLoading && (
                                    <tr>
                                        <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={6}>
                                            Loading recent sales...
                                        </td>
                                    </tr>
                                )}
                                {!companyDueQuery.isLoading && recentSales.length === 0 && (
                                    <tr>
                                        <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={6}>
                                            No sales found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                                {recentSales.map((sale) => (
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
                                        <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                                            {formatCurrency(sale.total_company_commission)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-600">
                                            {formatDateTime(sale.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-[920px] w-full table-fixed border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-100">
                                <tr className="divide-x divide-gray-200">
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Settled At
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Covered Through
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Net Amount
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Gross
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Refunded
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Note
                                    </th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {settlements.length === 0 && (
                                    <tr>
                                        <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={7}>
                                            No company due settlements recorded yet.
                                        </td>
                                    </tr>
                                )}
                                {settlements.map((settlement) => (
                                    <tr key={settlement._id} className="divide-x divide-gray-200">
                                        <td className="px-3 py-2 text-center text-sm text-gray-700">
                                            {formatDateTime(settlement.settled_at)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-xs font-semibold text-gray-800">
                                            {settlement.cutoff_invoice_number}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                                            {formatCurrency(settlement.net_settled_amount)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-700">
                                            {formatCurrency(settlement.gross_company_commission)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-red-600">
                                            {formatCurrency(settlement.refunded_company_commission)}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-600">
                                            {settlement.note || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-700 transition hover:border-[#3cc720] hover:text-[#111827]"
                                                onClick={() => handleDownloadSettlementReport(settlement)}
                                                type="button"
                                            >
                                                Download Report
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isSettlementModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 p-4">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter text-[#111827]">
                                    Mark Company Due As Collected
                                </h2>
                                <p className="text-xs font-semibold text-gray-500">
                                    Select the last invoice to include in this settlement
                                </p>
                            </div>
                            <button
                                className="rounded-full p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                                onClick={() => setIsSettlementModalOpen(false)}
                                type="button"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-5 overflow-y-auto p-6">
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Outstanding Due</p>
                                    <p className="mt-2 text-xl font-black text-gray-900">
                                        {formatCurrency(summary.total_company_commission)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Gross Commission</p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">
                                        {formatCurrency(summary.gross_company_commission)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Refunded Commission</p>
                                    <p className="mt-2 text-lg font-semibold text-red-600">
                                        {formatCurrency(summary.refunded_company_commission)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Selected Cutoff</p>
                                    <p className="mt-2 text-xs font-semibold text-gray-900">
                                        {selectedSettlementSale?.invoice_number || "-"}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        {selectedSettlementSale ? formatDateTime(selectedSettlementSale.created_at) : "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200">
                                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                                    <p className="text-sm font-black uppercase tracking-wide text-gray-900">
                                        Unsettled Invoices
                                    </p>
                                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                        Latest invoice is preselected. Select an earlier one to leave newer invoices unsettled.
                                    </p>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto">
                                    <table className="w-full table-fixed border-collapse text-left">
                                        <thead className="sticky top-0 border-b border-gray-200 bg-gray-100">
                                            <tr className="divide-x divide-gray-200">
                                                <th className="w-[84px] px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Pick</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Invoice</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Customer</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Created</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Sale Amount</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-gray-600">Commission</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {settlementOptions.map((sale) => (
                                                <tr
                                                    key={sale._id}
                                                    className={`divide-x divide-gray-200 ${
                                                        selectedSettlementSaleId === sale._id ? "bg-[#3cc720]/5" : ""
                                                    }`}
                                                >
                                                    <td className="px-3 py-2 text-center">
                                                        <input
                                                            checked={selectedSettlementSaleId === sale._id}
                                                            name="settlement-cutoff"
                                                            onChange={() => setSelectedSettlementSaleId(sale._id)}
                                                            type="radio"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-xs font-semibold text-gray-800">
                                                        {sale.invoice_number}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-sm text-gray-700">
                                                        {getDisplayCustomerName(sale.customer_snapshot?.name)}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                                                        {formatDateTime(sale.created_at)}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-800">
                                                        {formatCurrency(sale.total_amount)}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-sm font-semibold text-gray-900">
                                                        {formatCurrency(sale.total_company_commission)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {settlementOptions.length === 0 && (
                                                <tr>
                                                    <td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={6}>
                                                        No unsettled invoices available.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Note
                                </label>
                                <textarea
                                    className="min-h-[100px] w-full rounded border border-gray-200 bg-gray-50 p-3 text-sm font-medium outline-none focus:border-[#3cc720]"
                                    onChange={(event) => setSettlementNote(event.target.value)}
                                    placeholder="Optional settlement note..."
                                    value={settlementNote}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    className="rounded border border-gray-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-gray-700 transition hover:border-gray-300"
                                    onClick={() => setIsSettlementModalOpen(false)}
                                    type="button"
                                >
                                    Cancel
                                </button>
                                <button
                                    className="rounded bg-[#111827] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#3cc720] disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={createSettlementMutation.isPending || !selectedSettlementSale}
                                    onClick={handleConfirmSettlement}
                                    type="button"
                                >
                                    {createSettlementMutation.isPending ? "Processing..." : "Mark As Collected"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CompanyDuePage;
