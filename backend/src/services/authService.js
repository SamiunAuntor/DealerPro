const { getCollection } = require("../db/mongo");
const {
    AUTH_COLLECTION_NAME,
    AUTH_SINGLETON_EMAIL_FALLBACK,
    AUTH_TOKEN_TTL_SECONDS,
} = require("../constants/auth");
const { verifyPassword } = require("../utils/password");
const { signToken, verifyToken } = require("../utils/token");

function getAuthCollection() {
    return getCollection(AUTH_COLLECTION_NAME);
}

function getRequiredAuthEnv() {
    const adminEmail = String(process.env.ADMIN_EMAIL || AUTH_SINGLETON_EMAIL_FALLBACK)
        .trim()
        .toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || "");
    const jwtSecret = String(process.env.JWT_SECRET || "");

    if (!adminPassword) {
        throw new Error("ADMIN_PASSWORD is required");
    }

    if (!jwtSecret) {
        throw new Error("JWT_SECRET is required");
    }

    return {
        adminEmail,
        adminPassword,
        jwtSecret,
    };
}

function sanitizeUser(user) {
    return {
        id: String(user._id),
        email: user.email,
        role: user.role || "admin",
    };
}

async function loginAdmin({ email, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");

    if (!normalizedEmail || !normalizedPassword) {
        const error = new Error("Email and password are required");
        error.statusCode = 400;
        throw error;
    }

    const { jwtSecret } = getRequiredAuthEnv();
    const adminUser = await getAuthCollection().findOne({
        email: normalizedEmail,
        is_active: { $ne: false },
    });

    if (!adminUser || !verifyPassword(normalizedPassword, adminUser.password_hash)) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAtSeconds + AUTH_TOKEN_TTL_SECONDS;
    const user = sanitizeUser(adminUser);
    const token = signToken(
        {
            sub: user.id,
            email: user.email,
            role: user.role,
            iat: issuedAtSeconds,
            exp: expiresAtSeconds,
        },
        jwtSecret
    );

    return {
        token,
        expiresAtSeconds,
        user,
    };
}

function getSessionFromToken(token) {
    const { jwtSecret } = getRequiredAuthEnv();
    const payload = verifyToken(token, jwtSecret);

    return {
        user: {
            id: payload.sub,
            email: payload.email,
            role: payload.role || "admin",
        },
    };
}

module.exports = {
    loginAdmin,
    getSessionFromToken,
    getRequiredAuthEnv,
};
