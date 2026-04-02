/**
 * Compute a deterministic HMAC-SHA256 hash for a given value.
 * Used to hash PII (email, name) before storing as search attributes,
 * so that exact-match lookups are possible without exposing plaintext PII.
 */
export declare function hmacHash(value: string): string;
//# sourceMappingURL=crypto.d.ts.map