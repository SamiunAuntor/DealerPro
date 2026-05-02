function parseCookies(cookieHeader = "") {
    return String(cookieHeader)
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .reduce((cookies, pair) => {
            const separatorIndex = pair.indexOf("=");

            if (separatorIndex === -1) {
                return cookies;
            }

            const name = pair.slice(0, separatorIndex).trim();
            const value = pair.slice(separatorIndex + 1).trim();

            cookies[name] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function buildCookie(name, value, options = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];

    if (options.httpOnly) {
        parts.push("HttpOnly");
    }

    if (options.secure) {
        parts.push("Secure");
    }

    if (options.sameSite) {
        parts.push(`SameSite=${options.sameSite}`);
    }

    if (options.path) {
        parts.push(`Path=${options.path}`);
    }

    if (typeof options.maxAge === "number") {
        parts.push(`Max-Age=${options.maxAge}`);
    }

    return parts.join("; ");
}

module.exports = {
    parseCookies,
    buildCookie,
};
