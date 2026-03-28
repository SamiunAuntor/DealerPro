const salesService = require("../services/salesService");

function sendErrorResponse(res, error, fallbackMessage) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? fallbackMessage : error.message;

    if (statusCode === 500) {
        console.error(fallbackMessage, error);
    }

    return res.status(statusCode).json({ message });
}

async function createSale(req, res) {
    try {
        const sale = await salesService.createSale(req.body);
        return res.status(201).json({
            message: "Sale created successfully",
            sale,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to create sale");
    }
}

async function getSales(req, res) {
    try {
        const sales = await salesService.listSales(req.query);
        return res.json(sales);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch sales");
    }
}

async function getSale(req, res) {
    try {
        const sale = await salesService.getSaleById(req.params.id);
        return res.json(sale);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch sale");
    }
}

module.exports = {
    createSale,
    getSales,
    getSale,
};
