const { MongoClient } = require("mongodb");
const {
    WALK_IN_CUSTOMER_TAG,
    WALK_IN_CUSTOMER_PHONE,
    WALK_IN_CUSTOMER_NAME,
} = require("../constants/systemCustomers");
const {
    DEALER_VALUATION_COLLECTION,
    DEALER_VALUATION_SINGLETON_KEY,
    DEALER_OPENING_VALUATION_BDT,
    DEALER_OPENING_VALUATION_ENV_NAME,
} = require("../constants/dealerValuation");
const {
    AUTH_COLLECTION_NAME,
    AUTH_SINGLETON_EMAIL_FALLBACK,
} = require("../constants/auth");
const { hashPassword } = require("../utils/password");
const { roundMoney } = require("../utils/money");

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("DealerPro");
        await ensureIndexes();
        await ensureWalkInCustomer();
        await ensureDealerValuation();
        await ensureAdminUser();
        await backfillSalesPaymentState();
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
    await db.collection("sales").createIndex({ payment_status: 1, created_at: -1 });
    await db.collection("sales").createIndex({ customer_id: 1, due_amount: -1 });
    await db.collection("returns").createIndex({ return_number: 1 }, { unique: true });
    await db.collection("returns").createIndex({ original_sale_id: 1, created_at: -1 });
    await db.collection("returns").createIndex({ customer_id: 1, created_at: -1 });
    await db.collection("sale_payments").createIndex({ sale_id: 1, created_at: -1 });
    await db.collection("sale_payments").createIndex({ customer_id: 1, created_at: -1 });
    await db.collection("company_due_settlements").createIndex({ settled_at: -1 });
    await db.collection("company_due_settlements").createIndex({ cutoff_sale_id: 1 });
    await db.collection(AUTH_COLLECTION_NAME).createIndex({ email: 1 }, { unique: true });
    await db
        .collection(DEALER_VALUATION_COLLECTION)
        .createIndex({ singleton_key: 1 }, { unique: true });
}

async function ensureWalkInCustomer() {
    const customersCollection = db.collection("customers");
    const existingWalkInCustomer = await customersCollection.findOne({ system_tag: WALK_IN_CUSTOMER_TAG });
    const now = new Date();

    if (existingWalkInCustomer) {
        await customersCollection.updateOne(
            { _id: existingWalkInCustomer._id },
            {
                $set: {
                    name: WALK_IN_CUSTOMER_NAME,
                    phone: WALK_IN_CUSTOMER_PHONE,
                    updated_at: now,
                    is_system: true,
                    system_tag: WALK_IN_CUSTOMER_TAG,
                },
            }
        );
        return;
    }

    await customersCollection.insertOne({
        name: WALK_IN_CUSTOMER_NAME,
        phone: WALK_IN_CUSTOMER_PHONE,
        created_at: now,
        updated_at: now,
        is_system: true,
        system_tag: WALK_IN_CUSTOMER_TAG,
    });
}

async function ensureDealerValuation() {
    const dealerValuationCollection = db.collection(DEALER_VALUATION_COLLECTION);
    const existingDealerValuation = await dealerValuationCollection.findOne({
        singleton_key: DEALER_VALUATION_SINGLETON_KEY,
    });

    if (existingDealerValuation) {
        return;
    }

    const now = new Date();
    const configuredOpeningAmount = Number(process.env[DEALER_OPENING_VALUATION_ENV_NAME]);
    const openingValuationAmount =
        Number.isFinite(configuredOpeningAmount) && configuredOpeningAmount >= 0
            ? configuredOpeningAmount
            : DEALER_OPENING_VALUATION_BDT;

    await dealerValuationCollection.insertOne({
        singleton_key: DEALER_VALUATION_SINGLETON_KEY,
        opening_valuation_amount: openingValuationAmount,
        currency: "BDT",
        is_locked: true,
        seeded_by_system: true,
        created_at: now,
        updated_at: now,
    });
}

async function ensureAdminUser() {
    const authCollection = db.collection(AUTH_COLLECTION_NAME);
    const adminEmail = String(process.env.ADMIN_EMAIL || AUTH_SINGLETON_EMAIL_FALLBACK)
        .trim()
        .toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || "");

    if (!adminPassword) {
        throw new Error("ADMIN_PASSWORD is required");
    }

    if (!String(process.env.JWT_SECRET || "").trim()) {
        throw new Error("JWT_SECRET is required");
    }

    const existingAdmin = await authCollection.findOne({ email: adminEmail });

    if (existingAdmin) {
        return;
    }

    const now = new Date();

    await authCollection.insertOne({
        email: adminEmail,
        password_hash: hashPassword(adminPassword),
        role: "admin",
        is_active: true,
        is_seeded: true,
        created_at: now,
        updated_at: now,
    });
}

function buildLegacyPaymentSummary(sale) {
    const totalAmount = Math.max(roundMoney(sale.total_amount || 0), 0);
    const returnedAmount = Math.max(roundMoney(sale.return_summary?.returned_amount || 0), 0);
    const collectibleAmount = Math.max(roundMoney(totalAmount - returnedAmount), 0);
    const paidAmount =
        sale.paid_amount !== undefined && sale.paid_amount !== null
            ? Math.max(roundMoney(sale.paid_amount), 0)
            : totalAmount;
    const dueAmount = Math.max(roundMoney(collectibleAmount - paidAmount), 0);
    const refundDueAmount = Math.max(roundMoney(paidAmount - collectibleAmount), 0);

    let paymentStatus = "paid";

    if (dueAmount > 0 && paidAmount <= 0) {
        paymentStatus = "unpaid";
    } else if (dueAmount > 0) {
        paymentStatus = "partially_paid";
    }

    return {
        payment_status: paymentStatus,
        collectible_amount: collectibleAmount,
        paid_amount: paidAmount,
        applied_paid_amount: Math.min(paidAmount, collectibleAmount),
        due_amount: dueAmount,
        refund_due_amount: refundDueAmount,
        last_payment_at:
            sale.last_payment_at ||
            (paidAmount > 0 ? sale.updated_at || sale.created_at || new Date() : null),
    };
}

async function backfillSalesPaymentState() {
    const salesCollection = db.collection("sales");
    const salesNeedingBackfill = await salesCollection
        .find({
            $or: [
                { payment_status: { $exists: false } },
                { paid_amount: { $exists: false } },
                { due_amount: { $exists: false } },
                { collectible_amount: { $exists: false } },
                { refund_due_amount: { $exists: false } },
            ],
        })
        .project({
            total_amount: 1,
            return_summary: 1,
            paid_amount: 1,
            last_payment_at: 1,
            updated_at: 1,
            created_at: 1,
        })
        .toArray();

    if (salesNeedingBackfill.length === 0) {
        return;
    }

    await Promise.all(
        salesNeedingBackfill.map((sale) =>
            salesCollection.updateOne(
                { _id: sale._id },
                {
                    $set: buildLegacyPaymentSummary(sale),
                }
            )
        )
    );
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
