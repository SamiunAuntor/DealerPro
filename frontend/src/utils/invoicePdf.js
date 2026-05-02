import { jsPDF } from "jspdf";
import { formatCurrency, formatUnitLabel } from "./unitConversion";

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

function getDisplayCustomerName(sale) {
    return sale?.customer_snapshot?.name === "Walk-in Customer"
        ? "Anonymous Customer"
        : sale?.customer_snapshot?.name || "-";
}

function getDisplayCustomerPhone(sale) {
    const phone = sale?.customer_snapshot?.phone;

    if (!phone || phone === "WALK-IN-CUSTOMER" || phone === "ANONYMOUS-CUSTOMER") {
        return "-";
    }

    return phone;
}

function getPaymentStatusLabel(status) {
    if (status === "partially_paid") {
        return "Partially Paid";
    }

    if (status === "unpaid") {
        return "Unpaid";
    }

    return "Paid";
}

function getReturnStatusLabel(status) {
    if (status === "fully_returned") {
        return "Fully Returned";
    }

    if (status === "partially_returned") {
        return "Partially Returned";
    }

    return "Not Returned";
}

function createInvoicePdfDocument(sale) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const usableWidth = pageWidth - marginX * 2;
    const palette = {
        ink: [17, 24, 39],
        muted: [100, 116, 139],
        border: [218, 223, 232],
        panel: [248, 250, 252],
        headerDark: [15, 23, 42],
        accent: [60, 199, 32],
        accentSoft: [232, 250, 234],
        amber: [217, 119, 6],
        amberSoft: [255, 247, 237],
        blueSoft: [239, 246, 255],
        violetSoft: [245, 243, 255],
        tableHead: [241, 245, 249],
    };
    let y = 18;

    const ensureSpace = (requiredHeight = 10) => {
        if (y + requiredHeight <= pageHeight - 14) {
            return;
        }

        doc.addPage();
        y = 18;
    };

    const addSectionTitle = (title) => {
        ensureSpace(12);
        doc.setFillColor(...palette.panel);
        doc.setDrawColor(...palette.border);
        doc.roundedRect(marginX, y - 1, usableWidth, 9, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...palette.ink);
        doc.text(title.toUpperCase(), marginX + 3, y + 4.5);
        y += 11;
    };

    const addSummaryLine = (label, value = "") => {
        ensureSpace(7.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...palette.muted);
        doc.text(`${label}:`, marginX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...palette.ink);
        doc.text(String(value), 67, y);
        y += 5.5;
    };

    const drawInfoGrid = (items, columns = 2) => {
        const gap = 4;
        const cardWidth = (usableWidth - gap * (columns - 1)) / columns;
        const cardHeight = 16;

        for (let index = 0; index < items.length; index += columns) {
            const rowItems = items.slice(index, index + columns);
            ensureSpace(cardHeight + 2);

            rowItems.forEach((item, columnIndex) => {
                const x = marginX + columnIndex * (cardWidth + gap);
                doc.setFillColor(...palette.panel);
                doc.setDrawColor(...palette.border);
                doc.roundedRect(x, y, cardWidth, cardHeight, 2.5, 2.5, "FD");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(...palette.muted);
                doc.text(String(item.label || "").toUpperCase(), x + 3, y + 5.5);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(...palette.ink);
                const wrapped = doc.splitTextToSize(String(item.value || "-"), cardWidth - 6);
                doc.text(wrapped, x + 3, y + 11);
            });

            y += cardHeight + gap;
        }
    };

    const drawStatGrid = (items, columns = 2) => {
        const gap = 4;
        const cardWidth = (usableWidth - gap * (columns - 1)) / columns;
        const cardHeight = 22;
        const fills = [
            palette.headerDark,
            palette.accentSoft,
            palette.amberSoft,
            palette.blueSoft,
            palette.violetSoft,
        ];
        const valueColors = [
            [255, 255, 255],
            [17, 24, 39],
            [146, 64, 14],
            [17, 24, 39],
            [17, 24, 39],
        ];
        const labelColors = [
            [203, 213, 225],
            [22, 101, 52],
            [180, 83, 9],
            [37, 99, 235],
            [109, 40, 217],
        ];

        for (let index = 0; index < items.length; index += columns) {
            const rowItems = items.slice(index, index + columns);
            ensureSpace(cardHeight + 2);

            rowItems.forEach((item, columnIndex) => {
                const itemIndex = index + columnIndex;
                const x = marginX + columnIndex * (cardWidth + gap);
                doc.setFillColor(...(fills[itemIndex] || palette.panel));
                doc.setDrawColor(...palette.border);
                doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "FD");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                doc.setTextColor(...(labelColors[itemIndex] || palette.muted));
                doc.text(String(item.label || "").toUpperCase(), x + 3, y + 6);
                doc.setFontSize(itemIndex === 0 ? 14 : 12);
                doc.setTextColor(...(valueColors[itemIndex] || palette.ink));
                doc.text(String(item.value || "-"), x + 3, y + 14);
            });

            y += cardHeight + gap;
        }

        doc.setTextColor(...palette.ink);
    };

    const drawTable = (columns, rows) => {
        ensureSpace(18);

        const headerHeight = 8;
        const lineHeight = 6;
        const totalRequestedWidth = columns.reduce((sum, column) => sum + column.width, 0);
        const normalizedColumns = columns.map((column) => ({
            ...column,
            width: (column.width / totalRequestedWidth) * usableWidth,
        }));

        const drawHeader = () => {
            doc.setFillColor(...palette.tableHead);
            doc.rect(marginX, y, usableWidth, headerHeight, "F");
            doc.setDrawColor(...palette.border);
            doc.rect(marginX, y, usableWidth, headerHeight);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...palette.ink);

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
            doc.setTextColor(...palette.muted);
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
            doc.setTextColor(...palette.ink);
            let x = marginX;
            if ((rows.indexOf(row) || 0) % 2 === 0) {
                doc.setFillColor(252, 252, 253);
                doc.rect(marginX, y, usableWidth, rowHeight, "F");
            }

            normalizedColumns.forEach((column, index) => {
                doc.rect(x, y, column.width, rowHeight);
                doc.text(cellLines[index], x + 2, y + 5);
                x += column.width;
            });

            y += rowHeight;
        });

        y += 6;
    };

    doc.setFillColor(...palette.headerDark);
    doc.roundedRect(marginX, y, usableWidth, 24, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text("SALE INVOICE", marginX + 4, y + 9);
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated ${formatDateTime(new Date())}`, marginX + 4, y + 16);
    doc.setTextColor(...palette.accent);
    doc.setFontSize(11);
    doc.text(String(sale.invoice_number || "-"), marginX + usableWidth - 4, y + 9, {
        align: "right",
    });
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(8);
    doc.text("DealerPro", marginX + usableWidth - 4, y + 16, { align: "right" });
    y += 30;

    addSectionTitle("Invoice Summary");
    drawInfoGrid([
        { label: "Invoice Number", value: sale.invoice_number },
        { label: "Created At", value: formatDateTime(sale.created_at) },
        { label: "Customer", value: getDisplayCustomerName(sale) },
        { label: "Phone", value: getDisplayCustomerPhone(sale) },
        { label: "Channel", value: String(sale.channel || "-").toUpperCase() },
        { label: "Payment Status", value: getPaymentStatusLabel(sale.payment_status) },
        { label: "Return Status", value: getReturnStatusLabel(sale.return_status) },
        { label: "Last Payment", value: formatDateTime(sale.last_payment_at) },
    ]);

    addSectionTitle("Financials");
    drawStatGrid([
        { label: "Final Amount", value: formatCurrency(sale.total_amount || 0) },
        { label: "Paid Amount", value: formatCurrency(sale.paid_amount || 0) },
        { label: "Due Amount", value: formatCurrency(sale.due_amount || 0) },
        { label: "Refund Balance", value: formatCurrency(sale.refund_due_amount || 0) },
    ]);
    drawInfoGrid([
        { label: "Gross Amount", value: formatCurrency(sale.subtotal_amount || 0) },
        {
            label: "Subtotal After Company Discount",
            value: formatCurrency(sale.subtotal_after_company_discount || 0),
        },
        { label: "Dealer Discount", value: formatCurrency(sale.total_dealer_discount || 0) },
        { label: "Profit / Loss", value: formatCurrency(sale.profit_loss || 0) },
    ]);

    addSectionTitle("Items");
    drawTable(
        [
            { header: "Product", key: "product_name", width: 30 },
            { header: "Code", key: "product_code", width: 18 },
            { header: "Qty", key: "quantity", width: 12 },
            { header: "Unit", key: "unit_type", width: 14 },
            { header: "Pieces", key: "quantity_pieces", width: 14 },
            { header: "Final", key: "final_amount", width: 16 },
            { header: "Returned", key: "returned_quantity_pieces", width: 16 },
        ],
        (sale.items || []).map((item) => ({
            product_name: item.product_name,
            product_code: item.product_code,
            quantity: item.quantity,
            unit_type: formatUnitLabel(item.unit_type),
            quantity_pieces: item.quantity_pieces,
            final_amount: formatCurrency(item.final_amount || 0),
            returned_quantity_pieces: item.returned_quantity_pieces || 0,
        }))
    );

    if ((sale.payments || []).length > 0) {
        addSectionTitle("Payment History");
        drawTable(
            [
                { header: "Type", key: "payment_type", width: 16 },
                { header: "Amount", key: "amount", width: 16 },
                { header: "Method", key: "method", width: 16 },
                { header: "Recorded At", key: "created_at", width: 22 },
                { header: "Note", key: "note", width: 30 },
            ],
            sale.payments.map((payment) => ({
                payment_type: String(payment.payment_type || "-").replaceAll("_", " "),
                amount: formatCurrency(payment.amount || 0),
                method: payment.method || "-",
                created_at: formatDateTime(payment.created_at),
                note: payment.note || "-",
            }))
        );
    }

    if (Number(sale.return_summary?.returned_amount || 0) > 0) {
        addSectionTitle("Return Summary");
        addSummaryLine(
            "Returned Amount",
            formatCurrency(sale.return_summary?.returned_amount || 0)
        );
        addSummaryLine(
            "Returned Pieces",
            sale.return_summary?.returned_quantity_pieces || 0
        );
        addSummaryLine(
            "Returned Dealer Discount",
            formatCurrency(sale.return_summary?.returned_dealer_discount || 0)
        );
        addSummaryLine(
            "Returned Company Commission",
            formatCurrency(sale.return_summary?.returned_company_commission || 0)
        );
    }

    return doc;
}

export function downloadSaleInvoicePdf(sale) {
    const doc = createInvoicePdfDocument(sale);
    const filename = `${String(sale.invoice_number || "invoice").replace(/[^\w-]/g, "_")}.pdf`;
    doc.save(filename);
}

export function printSaleInvoicePdf(sale) {
    const doc = createInvoicePdfDocument(sale);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank", "noopener,noreferrer");
}
