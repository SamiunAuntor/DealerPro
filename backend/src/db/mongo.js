const { MongoClient } = require("mongodb");
const {
    WALK_IN_CUSTOMER_TAG,
    WALK_IN_CUSTOMER_PHONE,
    WALK_IN_CUSTOMER_NAME,
} = require("../constants/systemCustomers");

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("DealerPro");
        await ensureIndexes();
        await ensureWalkInCustomer();
        console.log("MongoDB connected to DealerPro DB");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

async function ensureIndexes() {
    await db.collection("customers").createIndex({ phone: 1 }, { unique: true });
    await db.collection("products").createIndex({ code: 1 }, { unique: true });
    await db.collection("products").createIndex({ product_id: 1 }, { unique: true });
    await db.collection("sales").createIndex({ invoice_number: 1 }, { unique: true });
    await db.collection("sales").createIndex({ customer_id: 1, created_at: -1 });
    await db.collection("sales").createIndex({ channel: 1, created_at: -1 });
    await db.collection("returns").createIndex({ return_number: 1 }, { unique: true });
    await db.collection("returns").createIndex({ original_sale_id: 1, created_at: -1 });
    await db.collection("returns").createIndex({ customer_id: 1, created_at: -1 });
}

async function ensureWalkInCustomer() {
    const customersCollection = db.collection("customers");
    const existingWalkInCustomer = await customersCollection.findOne({ system_tag: WALK_IN_CUSTOMER_TAG });

    if (existingWalkInCustomer) {
        return;
    }

    const now = new Date();

    await customersCollection.insertOne({
        name: WALK_IN_CUSTOMER_NAME,
        phone: WALK_IN_CUSTOMER_PHONE,
        created_at: now,
        updated_at: now,
        is_system: true,
        system_tag: WALK_IN_CUSTOMER_TAG,
    });
}

function getDB() {
    if (!db) {
        throw new Error("Database not initialized");
    }

    return db;
}

function getCollection(name) {
    return getDB().collection(name);
}

function getClient() {
    return client;
}

module.exports = { connectDB, getDB, getCollection, getClient };
