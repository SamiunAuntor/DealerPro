const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("DealerPro");
        await ensureIndexes();
        console.log("MongoDB connected to DealerPro DB");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

async function ensureIndexes() {
    await db.collection("customers").createIndex({ phone: 1 }, { unique: true });
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

module.exports = { connectDB, getDB, getCollection };
