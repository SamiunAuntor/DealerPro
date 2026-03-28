const UNIT_TYPES = Object.freeze({
    PIECES: "pieces",
    PACKET: "packet",
    CARTON: "carton",
});

const ALLOWED_UNIT_TYPES = Object.values(UNIT_TYPES);

function normalizeUnitType(unitType) {
    const normalized = String(unitType || "").trim().toLowerCase();

    if (normalized === "pkt") {
        return UNIT_TYPES.PACKET;
    }

    if (normalized === "box") {
        return UNIT_TYPES.CARTON;
    }

    return normalized;
}

function validateUnitType(unitType) {
    const normalizedUnitType = normalizeUnitType(unitType);

    if (!ALLOWED_UNIT_TYPES.includes(normalizedUnitType)) {
        const error = new Error("Unsupported unit type");
        error.statusCode = 400;
        throw error;
    }

    return normalizedUnitType;
}

function getPiecesPerUnit(product, unitType) {
    const normalizedUnitType = validateUnitType(unitType);

    if (normalizedUnitType === UNIT_TYPES.PIECES) {
        return 1;
    }

    if (normalizedUnitType === UNIT_TYPES.PACKET) {
        const piecesPerPacket = Number(product.pieces_per_packet);

        if (!Number.isFinite(piecesPerPacket) || piecesPerPacket <= 0) {
            const error = new Error(`Packet conversion is not configured for ${product.name}`);
            error.statusCode = 400;
            throw error;
        }

        return piecesPerPacket;
    }

    const piecesPerCarton = Number(product.pieces_per_cartoon);

    if (!Number.isFinite(piecesPerCarton) || piecesPerCarton <= 0) {
        const error = new Error(`Carton conversion is not configured for ${product.name}`);
        error.statusCode = 400;
        throw error;
    }

    return piecesPerCarton;
}

function convertToPieces({ quantity, unitType, product }) {
    const normalizedQuantity = Number(quantity);

    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
        const error = new Error("Quantity must be greater than zero");
        error.statusCode = 400;
        throw error;
    }

    return normalizedQuantity * getPiecesPerUnit(product, unitType);
}

function convertConfiguredValueToPieceValue(value, product) {
    const piecesPerConfiguredUnit = getPiecesPerUnit(product, product.unit_type || UNIT_TYPES.PIECES);
    return Number(value || 0) / piecesPerConfiguredUnit;
}

function buildStockSummary(product, stockPieces) {
    const pieces = Number(stockPieces) || 0;
    const piecesPerPacket = Number(product.pieces_per_packet) || 0;
    const piecesPerCarton = Number(product.pieces_per_cartoon) || 0;

    return {
        pieces,
        packets: piecesPerPacket > 0 ? Number((pieces / piecesPerPacket).toFixed(2)) : null,
        cartons: piecesPerCarton > 0 ? Number((pieces / piecesPerCarton).toFixed(2)) : null,
    };
}

module.exports = {
    UNIT_TYPES,
    ALLOWED_UNIT_TYPES,
    normalizeUnitType,
    validateUnitType,
    getPiecesPerUnit,
    convertToPieces,
    convertConfiguredValueToPieceValue,
    buildStockSummary,
};
