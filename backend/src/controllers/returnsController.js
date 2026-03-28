const returnsService = require("../services/returnsService");

function sendErrorResponse(res, error, fallbackMessage) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? fallbackMessage : error.message;

    if (statusCode === 500) {
        console.error(fallbackMessage, error);
    }

    return res.status(statusCode).json({ message });
}

async function createReturn(req, res) {
    try {
        const returnRecord = await returnsService.createReturn(req.body);
        return res.status(201).json({
            message: "Return created successfully",
            return: returnRecord,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to create return");
    }
}

async function getReturns(req, res) {
    try {
        const returns = await returnsService.listReturns(req.query);
        return res.json(returns);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch returns");
    }
}

async function getReturn(req, res) {
    try {
        const returnRecord = await returnsService.getReturnById(req.params.id);
        return res.json(returnRecord);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch return");
    }
}

module.exports = {
    createReturn,
    getReturns,
    getReturn,
};
