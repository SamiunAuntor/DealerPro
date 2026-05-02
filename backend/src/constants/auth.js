const AUTH_COLLECTION_NAME = "admin_users";
const AUTH_SINGLETON_EMAIL_FALLBACK = "admin@dealerpro.local";
const AUTH_COOKIE_NAME = "dealerpro_session";
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

module.exports = {
    AUTH_COLLECTION_NAME,
    AUTH_SINGLETON_EMAIL_FALLBACK,
    AUTH_COOKIE_NAME,
    AUTH_TOKEN_TTL_SECONDS,
};
