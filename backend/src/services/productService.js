const { ObjectId } = require("mongodb");
const { getCollection } = require("../db/mongo");
const {
    normalizeUnitType,
    validateUnitType,
    convertToPieces,
    buildStockSummary,
} = require("../utils/unitConversion");

const COLLECTION_NAME = "products";

function getProductCollection() {
    return getCollection(COLLECTION_NAME);
}

function toObjectId(id) {
    if (!ObjectId.isValid(id)) {
        const error = new Error("Invalid product ID");
        error.statusCode = 400;
        throw error;
    }

    return new ObjectId(id);
}

function normalizeProductPayload(payload = {}) {
    return {
        code: String(payload.code || "").trim(),
        product_id: String(payload.product_id || "").trim(),
        category: String(payload.category || "").trim(),
        name: String(payload.name || "").trim(),
        company_commission: Number(payload.company_commission) || 0,
        company_discount: Number(payload.company_discount) || 0,
        unit_type: normalizeUnitType(payload.unit_type || "pieces"),
        pieces_per_packet: Number(payload.pieces_per_packet) || 0,
        pieces_per_cartoon: Number(payload.pieces_per_cartoon) || 0,
        purchase_price: Number(payload.purchase_price) || 0,
        selling_price: Number(payload.selling_price) || 0,
        low_stock_threshold:
            Number.isFinite(Number(payload.low_stock_threshold)) && Number(payload.low_stock_threshold) >= 0
                ? Number(payload.low_stock_threshold)
                : 20,
    };
}

function validateProductPayload(product) {
    if (!product.code || !product.product_id || !product.category || !product.name) {
        const error = new Error("Required fields missing");
        error.statusCode = 400;
        throw error;
    }

    validateUnitType(product.unit_type);

    if (!Number.isFinite(product.low_stock_threshold) || product.low_stock_threshold < 0) {
        const error = new Error("Low stock threshold must be zero or greater");
        error.statusCode = 400;
        throw error;
    }
}

function getLegacyStockPieces(product) {
    return (product.stock || []).reduce((sum, entry) => {
        if (Number.isFinite(entry.quantity_pieces)) {
            return sum + Number(entry.quantity_pieces);
        }

        return sum + (Number(entry.quantity) || 0);
    }, 0);
}

function getCurrentStockPieces(product) {
    if (Number.isFinite(product.current_stock_pieces)) {
        return Number(product.current_stock_pieces);
    }

    return getLegacyStockPieces(product);
}

function serializeProduct(product) {
    const currentStockPieces = getCurrentStockPieces(product);
    const lowStockThreshold =
        Number.isFinite(Number(product.low_stock_threshold)) && Number(product.low_stock_threshold) >= 0
            ? Number(product.low_stock_threshold)
            : 20;

    return {
        ...product,
        unit_type: normalizeUnitType(product.unit_type || "pieces"),
        low_stock_threshold: lowStockThreshold,
        current_stock_pieces: currentStockPieces,
        stock_count: currentStockPieces,
        stock_summary: buildStockSummary(product, currentStockPieces),
    };
}

async function synchronizeLegacyStockState(product) {
    const currentStockPieces = getCurrentStockPieces(product);

    if (Number.isFinite(product.current_stock_pieces)) {
        return currentStockPieces;
    }

    await getProductCollection().updateOne(
        { _id: product._id },
        { $set: { current_stock_pieces: currentStockPieces } }
    );

    return currentStockPieces;
}

function handleMongoError(error) {
    if (error?.code === 11000) {
        const duplicatedField = error.keyPattern?.code
            ? "Product code already exists"
            : "Product ID already exists";
        const normalizedError = new Error(duplicatedField);
        normalizedError.statusCode = 409;
        throw normalizedError;
    }

    throw error;
}

async function listProducts() {
    const products = await getProductCollection().find({}).sort({ createdAt: -1 }).toArray();
    return products.map(serializeProduct);
}

async function getProductById(id) {
    const product = await getProductCollection().findOne({ _id: toObjectId(id) });

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    await synchronizeLegacyStockState(product);
    return serializeProduct(product);
}

async function createProduct(payload) {
    const product = normalizeProductPayload(payload);
    validateProductPayload(product);

    const now = new Date();
    const productToInsert = {
        ...product,
        stock: [],
        current_stock_pieces: 0,
        createdAt: now,
        lastUpdatedAt: now,
    };

    try {
        const result = await getProductCollection().insertOne(productToInsert);
        return getProductById(result.insertedId.toString());
    } catch (error) {
        handleMongoError(error);
    }
}

async function updateProduct(id, payload) {
    const productId = toObjectId(id);
    const currentProduct = await getProductCollection().findOne({ _id: productId });

    if (!currentProduct) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    const normalizedPayload = normalizeProductPayload({
        ...currentProduct,
        ...payload,
        code: currentProduct.code,
        product_id: currentProduct.product_id,
    });

    validateProductPayload(normalizedPayload);

    try {
        await getProductCollection().updateOne(
            { _id: productId },
            {
                $set: {
                    ...normalizedPayload,
                    lastUpdatedAt: new Date(),
                },
            }
        );

        return getProductById(id);
    } catch (error) {
        handleMongoError(error);
    }
}

async function ensureProductCanBeDeleted(id) {
    const salesCount = await getCollection("sales").countDocuments({ "items.product_id": toObjectId(id) });

    if (salesCount > 0) {
        const error = new Error("Product cannot be deleted because it has sales history");
        error.statusCode = 409;
        throw error;
    }
}

async function deleteProduct(id) {
    await ensureProductCanBeDeleted(id);

    const result = await getProductCollection().deleteOne({ _id: toObjectId(id) });

    if (result.deletedCount === 0) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    return { message: "Product deleted successfully" };
}

async function addStock(id, payload) {
    const productId = toObjectId(id);
    const product = await getProductCollection().findOne({ _id: productId });

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    const unitType = validateUnitType(payload.unit_type || "pieces");
    const quantity = Number(payload.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
        const error = new Error("Valid quantity is required");
        error.statusCode = 400;
        throw error;
    }

    const quantityPieces = convertToPieces({ quantity, unitType, product });
    const purchasePrice = Number.isFinite(Number(payload.purchase_price))
        ? Number(payload.purchase_price)
        : Number(product.purchase_price) || 0;
    const currentStockPieces = await synchronizeLegacyStockState(product);

    await getProductCollection().updateOne(
        { _id: productId },
        {
            $push: {
                stock: {
                    date: new Date(),
                    quantity,
                    unit_type: unitType,
                    quantity_pieces: quantityPieces,
                    purchase_price: purchasePrice,
                },
            },
            $set: {
                current_stock_pieces: currentStockPieces + quantityPieces,
                purchase_price: purchasePrice,
                lastUpdatedAt: new Date(),
            },
        }
    );

    return getProductById(id);
}

module.exports = {
    listProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    addStock,
    getCurrentStockPieces,
    synchronizeLegacyStockState,
    toObjectId,
};
