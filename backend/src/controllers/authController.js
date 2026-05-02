const { AUTH_COOKIE_NAME, AUTH_TOKEN_TTL_SECONDS } = require("../constants/auth");
const { buildCookie, parseCookies } = require("../utils/cookies");
const authService = require("../services/authService");

function getCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "None" : "Lax",
        path: "/",
        maxAge: AUTH_TOKEN_TTL_SECONDS,
    };
}

function clearSessionCookie(res) {
    res.setHeader(
        "Set-Cookie",
        buildCookie(AUTH_COOKIE_NAME, "", {
            ...getCookieOptions(),
            maxAge: 0,
        })
    );
}

function sendErrorResponse(res, error, fallbackMessage) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? fallbackMessage : error.message;

    if (statusCode === 500) {
        console.error(fallbackMessage, error);
    }

    return res.status(statusCode).json({ message });
}

async function login(req, res) {
    try {
        const { token, expiresAtSeconds, user } = await authService.loginAdmin(req.body || {});

        res.setHeader("Set-Cookie", buildCookie(AUTH_COOKIE_NAME, token, getCookieOptions()));
        return res.json({
            message: "Login successful",
            user,
            expires_at: expiresAtSeconds,
        });
    } catch (error) {
        clearSessionCookie(res);
        return sendErrorResponse(res, error, "Failed to login");
    }
}

async function logout(req, res) {
    clearSessionCookie(res);
    return res.json({ message: "Logout successful" });
}

async function getSession(req, res) {
    try {
        const cookies = parseCookies(req.headers.cookie || "");
        const token = cookies[AUTH_COOKIE_NAME];

        if (!token) {
            return res.status(401).json({ message: "Unauthenticated" });
        }

        const session = authService.getSessionFromToken(token);
        return res.json(session);
    } catch (error) {
        clearSessionCookie(res);
        return res.status(401).json({ message: "Unauthenticated" });
    }
}

module.exports = {
    login,
    logout,
    getSession,
};
