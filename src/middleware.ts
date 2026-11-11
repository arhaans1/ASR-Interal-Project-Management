import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, decodeSession } from './lib/session';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    // Null unless the cookie carries our signature and has not expired.
    const session = await decodeSession(token);

    const redirect = (to: string) => NextResponse.redirect(new URL(to, request.url));
    const home =
        session?.role === 'client' && session.clientId
            ? `/portal/${session.clientId}`
            : session?.role === 'operator'
                ? '/operator'
                : '/';

    // Already signed in: skip the login page
    if (path === '/login' || path === '/client-login') {
        return session ? redirect(home) : NextResponse.next();
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
        return redirect(home);
    }

    // Operator workspace: operators only
    if (path.startsWith('/operator') && session.role !== 'operator') {
        return redirect(home);
    }

    // Client portal: a client only ever sees their own. The team can open any for preview.
    if (path.startsWith('/portal') && session.role === 'client') {
        const requestedClientId = path.split('/')[2];
        if (session.clientId !== requestedClientId) {
            return redirect(home);
        }
    }

    return NextResponse.next();
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
