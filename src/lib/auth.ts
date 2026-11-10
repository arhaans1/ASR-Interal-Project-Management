import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'asr_session';

export interface SessionData {
    userId: string;
    role: 'admin' | 'operator' | 'client';
    clientId?: string; // If role is client
    username: string;
}

export async function createSession(data: SessionData) {
    const cookieStore = await cookies();
    // Simple base64 encoding for this "simple" auth requirement
    // In production, use a signed JWT (e.g. jose) or a secure random ID with server-side storage
    const sessionValue = btoa(JSON.stringify(data));

    cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // 7 days duration
        maxAge: 60 * 60 * 24 * 7,
    });
}

export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    try {
        return JSON.parse(atob(sessionCookie.value));
    } catch (e) {
        return null;
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
