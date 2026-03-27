const { ObjectId } = require("mongodb");
const { getCollection } = require("../db/mongo");

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
    const errors = [];

    if (!payload.name) {
        errors.push("Name is required");
    }

    if (!payload.phone) {
        errors.push("Phone is required");
    }

    return errors;
}

function toObjectId(id) {
    if (!ObjectId.isValid(id)) {
        const error = new Error("Invalid customer ID");
        error.statusCode = 400;
        throw error;
    }

    return new ObjectId(id);
}

function buildDuplicatePhoneError() {
    const error = new Error("Phone number already exists");
    error.statusCode = 409;
    return error;
}

function handleMongoError(error) {
    if (error?.code === 11000) {
        throw buildDuplicatePhoneError();
    }

    throw error;
}

async function listCustomers() {
    return getCustomerCollection()
        .find({})
        .sort({ created_at: -1 })
        .toArray();
}

async function getCustomerById(id) {
    const customer = await getCustomerCollection().findOne({ _id: toObjectId(id) });

    if (!customer) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
    }

    return customer;
}

async function createCustomer(payload) {
    const customer = normalizeCustomerPayload(payload);
    const errors = validateCustomerPayload(customer);

    if (errors.length > 0) {
        const error = new Error(errors[0]);
        error.statusCode = 400;
        throw error;
    }

    const now = new Date();
    const customerToInsert = {
        ...customer,
        created_at: now,
        updated_at: now,
    };

    try {
        const result = await getCustomerCollection().insertOne(customerToInsert);
        return getCustomerById(result.insertedId.toString());
    } catch (error) {
        handleMongoError(error);
    }
}

async function updateCustomer(id, payload) {
    const customerId = toObjectId(id);
    const customer = normalizeCustomerPayload(payload);
    const errors = validateCustomerPayload(customer);

    if (errors.length > 0) {
        const error = new Error(errors[0]);
        error.statusCode = 400;
        throw error;
    }

    try {
        const result = await getCustomerCollection().updateOne(
            { _id: customerId },
            {
                $set: {
                    ...customer,
                    updated_at: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            const error = new Error("Customer not found");
            error.statusCode = 404;
            throw error;
        }

        return getCustomerById(id);
    } catch (error) {
        handleMongoError(error);
    }
}

async function deleteCustomer(id) {
    const result = await getCustomerCollection().deleteOne({ _id: toObjectId(id) });

    if (result.deletedCount === 0) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
    }

    return { message: "Customer deleted successfully" };
}

module.exports = {
    listCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};
