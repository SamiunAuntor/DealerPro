export const UNIT_TYPES = {
    PIECES: "pieces",
    PACKET: "packet",
    CARTON: "carton",
};

export const UNIT_OPTIONS = [
    { value: UNIT_TYPES.PIECES, label: "Pieces" },
    { value: UNIT_TYPES.PACKET, label: "Packet" },
    { value: UNIT_TYPES.CARTON, label: "Carton" },
];

export function formatCurrency(value) {
    return `Tk ${Number(value || 0).toFixed(2)}`;
}

export function formatUnitLabel(unitType) {
    const normalizedUnit = String(unitType || "").toLowerCase();
    const match = UNIT_OPTIONS.find((option) => option.value === normalizedUnit);
    return match ? match.label : normalizedUnit;
}

export function getStockSummaryLabel(stockSummary = {}) {
    const fragments = [`${stockSummary.pieces || 0} pcs`];

    if (stockSummary.packets !== null && stockSummary.packets !== undefined) {
        fragments.push(`${stockSummary.packets} pkt`);
    }

    if (stockSummary.cartons !== null && stockSummary.cartons !== undefined) {
        fragments.push(`${stockSummary.cartons} ctn`);
    }

    return fragments.join(" | ");
}

export function convertToPieces(product, quantity, unitType) {
    const normalizedQuantity = Number(quantity) || 0;

    if (unitType === UNIT_TYPES.PACKET) {
        return normalizedQuantity * (Number(product.pieces_per_packet) || 0);
    }

    if (unitType === UNIT_TYPES.CARTON) {
        return normalizedQuantity * (Number(product.pieces_per_cartoon) || 0);
    }

    return normalizedQuantity;
}

export function getPiecesPerUnit(product, unitType) {
    if (unitType === UNIT_TYPES.PACKET) {
        return Number(product.pieces_per_packet) || 0;
    }

    if (unitType === UNIT_TYPES.CARTON) {
        return Number(product.pieces_per_cartoon) || 0;
    }

    return 1;
}

export function calculateSalePreview({ product, quantity, unitType }) {
    const quantityPieces = convertToPieces(product, quantity, unitType);
    const salePricePerPiece = Number(product.selling_price) || 0;
    const purchasePricePerPiece = Number(product.purchase_price) || 0;
    const grossAmount = salePricePerPiece * quantityPieces;
    const companyDiscountAmount = grossAmount * ((Number(product.company_discount) || 0) / 100);
    const netBeforeDealerDiscount = grossAmount - companyDiscountAmount;
    const costAmount = purchasePricePerPiece * quantityPieces;

    return {
        quantityPieces,
        salePricePerPiece,
        purchasePricePerPiece,
        grossAmount,
        companyDiscountAmount,
        netBeforeDealerDiscount,
        finalAmount: netBeforeDealerDiscount,
        profitLoss: netBeforeDealerDiscount - costAmount,
    };
}
