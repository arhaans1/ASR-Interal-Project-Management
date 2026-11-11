import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Passwords are stored as "scrypt$<salt>$<hash>". Server-side only.

const PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export const isHashed = (stored?: string | null) => Boolean(stored && stored.startsWith(`${PREFIX}$`));

export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
    return `${PREFIX}$${salt}$${hash}`;
}

// Checks a password against what is stored. Rows saved before hashing was introduced
// hold the plain password; those still match once, and `needsUpgrade` tells the caller
// to replace them with a hash.
export function verifyPassword(password: string, stored?: string | null): { ok: boolean; needsUpgrade: boolean } {
    if (!stored) return { ok: false, needsUpgrade: false };

    if (!isHashed(stored)) {
        const a = Buffer.from(password);
        const b = Buffer.from(stored);
        const ok = a.length === b.length && timingSafeEqual(a, b);
        return { ok, needsUpgrade: ok };
    }

    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return { ok: false, needsUpgrade: false };

    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(password, salt, expected.length);
    return { ok: expected.length === actual.length && timingSafeEqual(expected, actual), needsUpgrade: false };
}
