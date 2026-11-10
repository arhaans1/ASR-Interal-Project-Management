// Signed session tokens. Uses Web Crypto so the same code runs in API routes and in the middleware.

export const SESSION_COOKIE_NAME = 'asr_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
    userId: string;
    role: 'admin' | 'operator' | 'client';
    clientId?: string; // If role is client
    username: string;
}

// SESSION_SECRET is preferred. The service role key is a server-only secret that is already
// configured, so it is used when SESSION_SECRET has not been set yet.
const getSecret = () => process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSessionSecretConfigured = () => getSecret().length >= 16;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array) => {
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string) => {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

async function sign(payload: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(getSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return toBase64Url(new Uint8Array(signature));
}

// Compare without leaking where the strings differ.
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export async function encodeSession(data: SessionData): Promise<string> {
    if (!isSessionSecretConfigured()) {
        throw new Error('SESSION_SECRET is not set');
    }
    const body = { ...data, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
    const payload = toBase64Url(encoder.encode(JSON.stringify(body)));
    return `${payload}.${await sign(payload)}`;
}

// Returns the session only when the signature is ours and it has not expired.
export async function decodeSession(token?: string | null): Promise<SessionData | null> {
    if (!token || !isSessionSecretConfigured()) return null;

    const [payload, signature, ...rest] = token.split('.');
    if (!payload || !signature || rest.length > 0) return null;

    try {
        if (!safeEqual(signature, await sign(payload))) return null;

        const body = JSON.parse(decoder.decode(fromBase64Url(payload)));
        if (typeof body.exp !== 'number' || body.exp < Date.now() / 1000) return null;
        if (!body.userId || !['admin', 'operator', 'client'].includes(body.role)) return null;

        return { userId: body.userId, role: body.role, clientId: body.clientId, username: body.username };
    } catch {
        return null;
    }
}

export const isTeamRole = (role?: string | null) => role === 'admin' || role === 'operator';
