import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    CLIENT_SESSION_MAX_AGE,
    SESSION_COOKIE_NAME,
    SESSION_RENEW_AFTER,
    decodeSessionWithExpiry,
    encodeSession,
} from './lib/session';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    // Null unless the cookie carries our signature and has not expired.
    const decoded = await decodeSessionWithExpiry(token);
    const session = decoded?.session ?? null;

    // Clients stay signed in: once a day, opening the portal gives them a fresh long-lived cookie.
    const keepClientSignedIn = async (response: NextResponse) => {
        if (!decoded || decoded.session.role !== 'client') return response;
        const issuedAt = decoded.exp - CLIENT_SESSION_MAX_AGE;
        if (Date.now() / 1000 - issuedAt < SESSION_RENEW_AFTER) return response;
        try {
            response.cookies.set(SESSION_COOKIE_NAME, await encodeSession(decoded.session), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: CLIENT_SESSION_MAX_AGE,
            });
        } catch {
            // Renewal is a convenience; the current cookie still works.
        }
        return response;
    };

    const redirect = (to: string) => NextResponse.redirect(new URL(to, request.url));
    const home =
        session?.role === 'client' && session.clientId
            ? `/portal/${session.clientId}`
            : session?.role === 'operator'
                ? '/operator'
                : '/';

    // Already signed in: skip the login page
    if (path === '/login' || path === '/client-login') {
        return session ? keepClientSignedIn(redirect(home)) : NextResponse.next();
    }

    const isProtectedRoute = path === '/' || path.startsWith('/portal') || path.startsWith('/operator');
    if (!isProtectedRoute) return NextResponse.next();

    if (!session) {
        // Clients are sent to their own sign-in page
        const response = redirect(path.startsWith('/portal') ? '/client-login' : '/login');
        // Drop cookies that are forged, expired or from before sessions were signed.
        if (token) response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
    }

    // Team workspace: team members and operators
    if (path === '/' && session.role === 'client') {
        return keepClientSignedIn(redirect(home));
    }

    // Operator workspace: operators only
    if (path.startsWith('/operator') && session.role !== 'operator') {
        return redirect(home);
    }

    // Client portal: a client only ever sees their own. The team can open any for preview.
    if (path.startsWith('/portal') && session.role === 'client') {
        const requestedClientId = path.split('/')[2];
        if (session.clientId !== requestedClientId) {
            return keepClientSignedIn(redirect(home));
        }
    }

    return keepClientSignedIn(NextResponse.next());
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
