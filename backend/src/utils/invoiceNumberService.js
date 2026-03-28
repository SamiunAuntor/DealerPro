const { getCollection } = require("../db/mongo");

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}${month}${day}`;
}

function getCustomerToken(customer) {
    const phoneDigits = String(customer?.phone || "").replace(/\D/g, "");

    if (phoneDigits.length >= 4) {
        return phoneDigits.slice(-4);
    }

    return "0000";
}

async function generateDocumentNumber({ scope, prefix, customer, now = new Date() }) {
    const dateKey = getDateKey(now);
    const countersCollection = getCollection("invoice_counters");

    const counter = await countersCollection.findOneAndUpdate(
        { _id: scope },
        { $inc: { sequence: 1 }, $setOnInsert: { created_at: now } },
        { upsert: true, returnDocument: "after" }
    );

    const sequence = String(counter.sequence).padStart(7, "0");
    const customerToken = getCustomerToken(customer);

    return `${prefix}-${dateKey}-${customerToken}-${sequence}`;
}

async function generateInvoiceNumber(customer, now = new Date()) {
    return generateDocumentNumber({
        scope: "sales",
        prefix: "INV",
        customer,
        now,
    });
}

async function generateReturnNumber(customer, now = new Date()) {
    return generateDocumentNumber({
        scope: "returns",
        prefix: "RTN",
        customer,
        now,
    });
}

module.exports = {
    generateInvoiceNumber,
    generateReturnNumber,
};
