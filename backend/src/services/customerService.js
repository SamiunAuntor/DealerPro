const { ObjectId } = require("mongodb");
const { getCollection } = require("../db/mongo");
const { WALK_IN_CUSTOMER_TAG } = require("../constants/systemCustomers");
const { roundMoney } = require("../utils/money");

const COLLECTION_NAME = "customers";

function getCustomerCollection() {
    return getCollection(COLLECTION_NAME);
}

function normalizeCustomerPayload(payload = {}) {
    return {
        name: String(payload.name || "").trim(),
        phone: String(payload.phone || "").trim(),
    };
}

function validateCustomerPayload(payload) {
    if (!payload.name) {
        const error = new Error("Name is required");
        error.statusCode = 400;
        throw error;
    }

    if (!payload.phone) {
        const error = new Error("Phone is required");
        error.statusCode = 400;
        throw error;
    }
}

function toObjectId(id) {
    if (!ObjectId.isValid(id)) {
        const error = new Error("Invalid customer ID");
        error.statusCode = 400;
        throw error;
    }

    return new ObjectId(id);
}

function handleMongoError(error) {
    if (error?.code === 11000) {
        const normalizedError = new Error("Phone number already exists");
        normalizedError.statusCode = 409;
        throw normalizedError;
    }

    throw error;
}

async function listCustomersWithOptions(options = {}) {
    const query = options.includeSystem ? {} : { is_system: { $ne: true } };
    const customers = await getCustomerCollection()
        .find(query)
        .sort({ created_at: -1 })
        .toArray();

    if (customers.length === 0) {
        return [];
    }

    const customerIds = customers.map((customer) => customer._id);
    const dueSummaries = await getCollection("sales")
        .aggregate([
            {
                $match: {
                    customer_id: { $in: customerIds },
                    due_amount: { $gt: 0 },
                },
            },
            {
                $group: {
                    _id: "$customer_id",
                    total_due_amount: { $sum: "$due_amount" },
                },
            },
        ])
        .toArray();
    const dueByCustomerId = new Map(
        dueSummaries.map((row) => [String(row._id), roundMoney(row.total_due_amount || 0)])
    );

    return customers.map((customer) => ({
        ...customer,
        total_due_amount: dueByCustomerId.get(String(customer._id)) || 0,
    }));
}

async function getCustomerById(id, options = {}) {
    const query = { _id: toObjectId(id) };

    if (!options.includeSystem) {
        query.is_system = { $ne: true };
    }

    const customer = await getCustomerCollection().findOne(query);

    if (!customer) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
    }

    return customer;
}

async function getWalkInCustomer() {
    const customer = await getCustomerCollection().findOne({ system_tag: WALK_IN_CUSTOMER_TAG });

    if (!customer) {
        const error = new Error("Walk-in customer is not configured");
        error.statusCode = 500;
        throw error;
    }

    return customer;
}

async function createCustomer(payload) {
    const customer = normalizeCustomerPayload(payload);
    validateCustomerPayload(customer);

    const now = new Date();
    const customerToInsert = {
        ...customer,
        created_at: now,
        updated_at: now,
        is_system: false,
    };

    try {
        const result = await getCustomerCollection().insertOne(customerToInsert);
        return getCustomerById(result.insertedId.toString(), { includeSystem: true });
    } catch (error) {
        handleMongoError(error);
    }
}

async function updateCustomer(id, payload) {
    const customerId = toObjectId(id);
    const existingCustomer = await getCustomerCollection().findOne({ _id: customerId });

    if (!existingCustomer) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
    }

    if (existingCustomer.is_system) {
        const error = new Error("System customer cannot be edited");
        error.statusCode = 409;
        throw error;
    }

    const customer = normalizeCustomerPayload(payload);
    validateCustomerPayload(customer);

    try {
        await getCustomerCollection().updateOne(
            { _id: customerId },
            {
                $set: {
                    ...customer,
                    updated_at: new Date(),
                },
            }
        );

        return getCustomerById(id, { includeSystem: true });
    } catch (error) {
        handleMongoError(error);
    }
}

async function deleteCustomer(id) {
    const customerId = toObjectId(id);
    const customer = await getCustomerCollection().findOne({ _id: customerId });

    if (!customer) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
    }

    if (customer.is_system) {
        const error = new Error("System customer cannot be deleted");
        error.statusCode = 409;
        throw error;
    }

    const salesCount = await getCollection("sales").countDocuments({ customer_id: customerId });

    if (salesCount > 0) {
        const error = new Error("Customer cannot be deleted because it has sales history");
        error.statusCode = 409;
        throw error;
    }

    const result = await getCustomerCollection().deleteOne({ _id: customerId });

    if (result.deletedCount === 0) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
    }

    return { message: "Customer deleted successfully" };
}

module.exports = {
    listCustomersWithOptions,
    getCustomerById,
    getWalkInCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};
