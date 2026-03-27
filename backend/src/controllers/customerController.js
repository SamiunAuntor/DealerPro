const customerService = require("../services/customerService");

function sendErrorResponse(res, error, fallbackMessage) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? fallbackMessage : error.message;

    if (statusCode === 500) {
        console.error(fallbackMessage, error);
    }

    return res.status(statusCode).json({ message });
}

async function getCustomers(req, res) {
    try {
        const customers = await customerService.listCustomers();
        return res.json(customers);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch customers");
    }
}

async function getCustomer(req, res) {
    try {
        const customer = await customerService.getCustomerById(req.params.id);
        return res.json(customer);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to fetch customer");
    }
}

async function addCustomer(req, res) {
    try {
        const customer = await customerService.createCustomer(req.body);
        return res.status(201).json({
            message: "Customer created successfully",
            customer,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to create customer");
    }
}

async function updateCustomer(req, res) {
    try {
        const customer = await customerService.updateCustomer(req.params.id, req.body);
        return res.json({
            message: "Customer updated successfully",
            customer,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to update customer");
    }
}

async function deleteCustomer(req, res) {
    try {
        const result = await customerService.deleteCustomer(req.params.id);
        return res.json(result);
    } catch (error) {
        return sendErrorResponse(res, error, "Failed to delete customer");
    }
}

module.exports = {
    getCustomers,
    getCustomer,
    addCustomer,
    updateCustomer,
    deleteCustomer,
};
