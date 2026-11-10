import { cookies } from 'next/headers';
import {
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE,
    SessionData,
    decodeSession,
    encodeSession,
    isTeamRole,
} from './session';

export { SESSION_COOKIE_NAME };
export type { SessionData };

export async function createSession(data: SessionData) {
    const cookieStore = await cookies();
    // The cookie is signed, so its contents cannot be edited or forged in the browser.
    const sessionValue = await encodeSession(data);

    cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
    });
}

export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    return decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

// Team members and operators. Clients and signed-out visitors get null.
export async function getTeamSession(): Promise<SessionData | null> {
    const session = await getSession();
    return session && isTeamRole(session.role) ? session : null;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
