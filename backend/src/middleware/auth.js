const { AUTH_COOKIE_NAME } = require("../constants/auth");
const { parseCookies } = require("../utils/cookies");
const authService = require("../services/authService");

function requireAuth(req, res, next) {
    try {
        const cookies = parseCookies(req.headers.cookie || "");
        const token = cookies[AUTH_COOKIE_NAME];

        if (!token) {
            return res.status(401).json({ message: "Unauthenticated" });
        }

        const session = authService.getSessionFromToken(token);
        req.user = session.user;
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthenticated" });
    }
}

module.exports = {
    requireAuth,
};
