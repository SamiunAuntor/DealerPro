const { getCollection } = require("../db/mongo");

// GET all products
async function getProducts(req, res) {
    try {
        const products = await getCollection("products").find({}).toArray();
        res.json(products);
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

            createdAt: new Date()
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

// PUT update product
async function updateProduct(req, res) {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const result = await getCollection("products").updateOne(
            { _id: new require("mongodb").ObjectId(id) },
            { $set: updateData }
        );
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update product" });
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
