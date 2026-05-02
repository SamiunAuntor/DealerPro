const crypto = require("crypto");

const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEY_LENGTH = 64;
const PBKDF2_DIGEST = "sha512";

function hashPassword(password) {
    const normalizedPassword = String(password || "");

    if (!normalizedPassword) {
        throw new Error("Password is required");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
        .pbkdf2Sync(
            normalizedPassword,
            salt,
            PBKDF2_ITERATIONS,
            PBKDF2_KEY_LENGTH,
            PBKDF2_DIGEST
        )
        .toString("hex");

    return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
    const normalizedPassword = String(password || "");
    const [algorithm, iterations, salt, expectedHash] = String(storedHash || "").split("$");

    if (
        algorithm !== "pbkdf2" ||
        !iterations ||
        !salt ||
        !expectedHash ||
        !normalizedPassword
    ) {
        return false;
    }

    const derivedHash = crypto
        .pbkdf2Sync(
            normalizedPassword,
            salt,
            Number(iterations),
            PBKDF2_KEY_LENGTH,
            PBKDF2_DIGEST
        )
        .toString("hex");

    const derivedBuffer = Buffer.from(derivedHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (derivedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
}

module.exports = {
    hashPassword,
    verifyPassword,
};
