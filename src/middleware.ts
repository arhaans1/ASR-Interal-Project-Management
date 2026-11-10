
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/auth';

export function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const path = request.nextUrl.pathname;

    // 1. If trying to access login page while already logged in
    if (path === '/login') {
        if (sessionCookie?.value) {
            try {
                const session = JSON.parse(atob(sessionCookie.value));
                if (session.role === 'admin') {
                    return NextResponse.redirect(new URL('/', request.url));
                } else if (session.role === 'operator') {
                    return NextResponse.redirect(new URL('/operator', request.url));
                } else if (session.role === 'client' && session.clientId) {
                    return NextResponse.redirect(new URL(`/portal/${session.clientId}`, request.url));
                }
            } catch (e) {
                // Invalid session, proceed to login
            }
        }
        return NextResponse.next();
    }

    // 2. Protect protected routes
    const isProtectedRoute = path === '/' || path.startsWith('/portal') || path.startsWith('/operator');

    if (isProtectedRoute && !sessionCookie?.value) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. Role-based Access Control
    if (sessionCookie?.value) {
        try {
            const session = JSON.parse(atob(sessionCookie.value));

            // ADMIN ONLY routes
            if (path === '/') {
                if (session.role !== 'admin') {
                    // Operators have their own workspace
                    if (session.role === 'operator') {
                        return NextResponse.redirect(new URL('/operator', request.url));
                    }
                    // Client trying to access Admin Dashboard -> Redirect to Portal
                    if (session.role === 'client' && session.clientId) {
                        return NextResponse.redirect(new URL(`/portal/${session.clientId}`, request.url));
                    }
                    return NextResponse.redirect(new URL('/login', request.url));
                }
            }

            // OPERATOR WORKSPACE: operators see their own clients, admins see everyone's
            if (path.startsWith('/operator')) {
                if (session.role === 'client' && session.clientId) {
                    return NextResponse.redirect(new URL(`/portal/${session.clientId}`, request.url));
                }
                if (session.role !== 'admin' && session.role !== 'operator') {
                    return NextResponse.redirect(new URL('/login', request.url));
                }
            }

            // CLIENT PORTAL protection
            if (path.startsWith('/portal')) {
                // Extract clientId from path
                const pathParts = path.split('/');
                const requestedClientId = pathParts[2]; // /portal/[clientId]

                if (session.role === 'client') {
                    // Verify client is accessing THEIR OWN portal
                    if (session.clientId !== requestedClientId) {
                        return NextResponse.redirect(new URL(`/portal/${session.clientId}`, request.url));
                    }
                }
                // Admins can access any portal (optional, but good for previewing)
            }

        } catch (e) {
            // Invalid session -> Logout/Login
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete(SESSION_COOKIE_NAME);
            return response;
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
         * - public folder files (images etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
