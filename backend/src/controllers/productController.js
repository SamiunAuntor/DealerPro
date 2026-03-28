const productService = require("../services/productService");

function sendErrorResponse(res, error, fallbackMessage) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? fallbackMessage : error.message;

    if (statusCode === 500) {
        console.error(fallbackMessage, error);
    }

    return res.status(statusCode).json({ message });
}

async function getProducts(req, res) {
    try {
        const products = await productService.listProducts();
        return res.json(products);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch products");
    }
}

async function getProductById(req, res) {
    try {
        const product = await productService.getProductById(req.params.id);
        return res.json(product);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch product");
    }
}

async function addProduct(req, res) {
    try {
        const product = await productService.createProduct(req.body);
        return res.status(201).json({
            message: "Product registered successfully",
            product,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to add product");
    }
}

async function updateProduct(req, res) {
    try {
        const product = await productService.updateProduct(req.params.id, req.body);
        return res.json({
            message: "Product updated successfully",
            product,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to update product");
    }
}

async function deleteProduct(req, res) {
    try {
        const result = await productService.deleteProduct(req.params.id);
        return res.json(result);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to delete product");
    }
}

async function stockIn(req, res) {
    try {
        const product = await productService.addStock(req.params.id, req.body);
        return res.json({
            message: "Stock added successfully",
            product,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to update stock");
    }
}

module.exports = { getProducts, getProductById, addProduct, updateProduct, deleteProduct, stockIn };
