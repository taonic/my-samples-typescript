"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmacHash = hmacHash;
const crypto_1 = require("crypto");
const HMAC_KEY = process.env.HMAC_SECRET_KEY ?? 'default-hmac-secret-key-change-in-production';
/**
 * Compute a deterministic HMAC-SHA256 hash for a given value.
 * Used to hash PII (email, name) before storing as search attributes,
 * so that exact-match lookups are possible without exposing plaintext PII.
 */
function hmacHash(value) {
    return (0, crypto_1.createHmac)('sha256', HMAC_KEY).update(value.toLowerCase().trim()).digest('hex');
}
//# sourceMappingURL=crypto.js.map