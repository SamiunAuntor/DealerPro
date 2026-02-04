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
        const data = req.body;
        const result = await getCollection("products").insertOne(data);
        res.status(201).json(result);
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
