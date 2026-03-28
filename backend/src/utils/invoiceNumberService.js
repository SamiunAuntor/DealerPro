const { getCollection } = require("../db/mongo");

function getDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function getCustomerToken(customer) {
    const phoneDigits = String(customer?.phone || "").replace(/\D/g, "");

    if (phoneDigits.length >= 4) {
        return phoneDigits.slice(-4);
    }

    const nameToken = String(customer?.name || "CUST")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 4);

    return nameToken || "CUST";
}

async function generateInvoiceNumber(customer, now = new Date()) {
    const dateKey = getDateKey(now);
    const countersCollection = getCollection("invoice_counters");

    const counter = await countersCollection.findOneAndUpdate(
        { _id: `sales:${dateKey}` },
        { $inc: { sequence: 1 }, $setOnInsert: { created_at: now } },
        { upsert: true, returnDocument: "after" }
    );

    const sequence = String(counter.sequence).padStart(4, "0");
    const customerToken = getCustomerToken(customer);

    return `INV-${dateKey}-${sequence}-${customerToken}`;
}

module.exports = {
    generateInvoiceNumber,
};
