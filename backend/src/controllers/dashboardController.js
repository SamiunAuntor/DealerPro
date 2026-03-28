const dashboardService = require("../services/dashboardService");

function sendErrorResponse(res, error, fallbackMessage) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? fallbackMessage : error.message;

    if (statusCode === 500) {
        console.error(fallbackMessage, error);
    }

    return res.status(statusCode).json({ message });
}

async function getDashboardOverview(req, res) {
    try {
        const overview = await dashboardService.getDashboardOverview(req.query.range);
        return res.json(overview);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch dashboard overview");
    }
}

module.exports = {
    getDashboardOverview,
};
