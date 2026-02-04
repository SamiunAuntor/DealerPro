const express = require("express");
const router = express.Router();
const {
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    stockIn
} = require("../controllers/productController");

// CRUD routes
router.get("/get-all-products", getProducts);
router.get("/get-product/:id", getProductById);
router.post("/add-product", addProduct);
router.patch("/update-product/:id", updateProduct);
router.delete("/delete-product/:id", deleteProduct);
router.post("/stock-in/:id", stockIn);
module.exports = router;
