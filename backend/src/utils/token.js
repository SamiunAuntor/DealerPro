const crypto = require("crypto");

function base64UrlEncode(input) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
    const normalized = String(input || "")
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signToken(payload, secret) {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
        .createHmac("sha256", String(secret || ""))
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token, secret) {
    const [encodedHeader, encodedPayload, signature] = String(token || "").split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
        throw new Error("Invalid token");
    }

    const expectedSignature = crypto
        .createHmac("sha256", String(secret || ""))
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
        providedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
        throw new Error("Invalid token signature");
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    if (payload.exp && Date.now() >= Number(payload.exp) * 1000) {
        throw new Error("Token expired");
    }

    return payload;
}

module.exports = {
    signToken,
    verifyToken,
};
