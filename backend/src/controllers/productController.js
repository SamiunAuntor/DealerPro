const { getCollection } = require("../db/mongo");

// GET all products with computed stock_count
async function getProducts(req, res) {
    try {
        const products = await getCollection("products").find({}).toArray();

        // Map over products and compute total stock
        const productsWithStock = products.map(p => {
            const stock_count = p.stock?.reduce((acc, s) => acc + (s.quantity || 0), 0) || 0;
            return {
                ...p,
                stock_count, // add total stock
            };
        });

        res.json(productsWithStock);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch products" });
    }
}

// GET single product
async function getProductById(req, res) {
    const { id } = req.params;
    try {
        const product = await getCollection("products").findOne({ _id: new require("mongodb").ObjectId(id) });
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch product" });
    }
}

// POST add new product
async function addProduct(req, res) {
    try {
        const {
            code,
            product_id,
            category,
            name,
            company_commission,
            company_discount,
            unit_type,
            pieces_per_packet,
            pieces_per_cartoon,
            purchase_price,
            selling_price
        } = req.body;

        // basic validation
        if (!code || !product_id || !category || !name) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        const product = {
            code,
            product_id,
            category,
            name,
            company_commission: Number(company_commission) || 0,
            company_discount: Number(company_discount) || 0,
            unit_type,
            pieces_per_packet: Number(pieces_per_packet) || 0,
            pieces_per_cartoon: Number(pieces_per_cartoon) || 0,
            purchase_price: Number(purchase_price) || 0,
            selling_price: Number(selling_price) || 0,

            // STOCK INITIALIZED HERE
            stock: [
                {
                    date: new Date(),
                    quantity: 0,
                }
            ],

            createdAt: new Date(),
            lastUpdatedAt: null // initially null

        };

        const result = await getCollection("products").insertOne(product);

        res.status(201).json({
            message: "Product registered successfully",
            insertedId: result.insertedId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add product" });
    }
}

// PATCH update product (partial update) + lastUpdatedAt
// PATCH update product (partial update) + lastUpdatedAt
async function updateProduct(req, res) {
    const { id } = req.params;

    // 1. Create a clean copy of body
    const updateData = { ...req.body };

    // 2. Remove fields that shouldn't be updated manually via this route
    delete updateData._id;
    delete updateData.stock;
    delete updateData.stock_count;

    updateData.lastUpdatedAt = new Date();

    try {
        // We use require("mongodb").ObjectId(id) to ensure it's defined
        const { ObjectId } = require("mongodb");

        const result = await getCollection("products").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product updated successfully" });
    } catch (err) {
        // This log will now tell you exactly what went wrong if it fails again
        console.error("Backend Update Error Details:", err);
        res.status(500).json({ message: "Failed to update product", error: err.message });
    }
}

// DELETE product
async function deleteProduct(req, res) {
    const { id } = req.params;
    try {
        const result = await getCollection("products").deleteOne({ _id: new require("mongodb").ObjectId(id) });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete product" });
    }
}

module.exports = { getProducts, getProductById, addProduct, updateProduct, deleteProduct };
