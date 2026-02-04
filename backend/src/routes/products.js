const express = require("express");
const router = express.Router();
const {
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

// CRUD routes
router.get("/get-all-products", getProducts);
router.get("/get-product/:id", getProductById);
router.post("/add-product", addProduct);
router.patch("/update-product/:id", updateProduct);
router.delete("/delete-product/:id", deleteProduct);

module.exports = router;
