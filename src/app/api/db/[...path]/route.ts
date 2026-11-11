import { NextResponse } from 'next/server';
import { getTeamAccess, TeamAccess } from '@/lib/access';

// The team workspace's door to the database.
//
// The browser's Supabase client points here instead of at Supabase. Each request is checked
// for a signed-in team member or operator, then forwarded with the service role key, which
// stays on the server. Clients and signed-out visitors get nothing.

export const dynamic = 'force-dynamic';

// Tables the workspace reads and writes. `users` is deliberately absent: logins are only
// ever handled by the /api/users and /api/auth routes.
const ALLOWED_TABLES = new Set(['clients', 'categories', 'tasks', 'quick_notes', 'chat_messages']);

// Query parameters that shape a result rather than narrow it down
const NON_FILTER_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict']);

const FORWARDED_REQUEST_HEADERS = ['content-type', 'prefer', 'accept', 'range', 'range-unit', 'accept-profile', 'content-profile'];
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-range', 'preference-applied', 'location'];

interface Context {
    params: Promise<{ path: string[] }>;
}

const refuse = (status: number, message: string) => NextResponse.json({ message }, { status });

// Stored passwords never reach the browser, not even as a hash. The workspace only needs
// to know whether one has been set.
function hidePasswords(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(hidePasswords);
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
            out[key] = key === 'password' ? (inner ? 'set' : null) : hidePasswords(inner);
        }
        return out;
    }
    return value;
}

// Team members do not see other people's task boards: those cards, their lists and their
// tasks are taken out of every answer. Admins see everything.
function hideOtherBoards(table: string, value: unknown, access: TeamAccess): unknown {
    if (access.isAdmin || (access.hiddenBoardIds.length === 0 && access.hiddenCategoryIds.length === 0)) return value;

    const boards = new Set(access.hiddenBoardIds);
    const lists = new Set(access.hiddenCategoryIds);
    const hidden = (row: any) =>
        !row || typeof row !== 'object'
            ? false
            : table === 'clients'
                ? boards.has(row.id)
                : table === 'categories'
                    ? boards.has(row.client_id) || lists.has(row.id)
                    : table === 'tasks'
                        ? lists.has(row.category_id)
                        : table === 'quick_notes' || table === 'chat_messages'
                            ? boards.has(row.client_id)
                            : false;

    if (Array.isArray(value)) return value.filter((row) => !hidden(row));
    // A single row was asked for and it is not theirs to see.
    return hidden(value) ? null : value;
}

// Passwords are only written by the credentials route, where they are hashed.
function dropPasswords(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(dropPasswords);
    if (value && typeof value === 'object') {
        const { password: _ignored, ...rest } = value as Record<string, unknown>;
        return rest;
    }
    return value;
}

async function forward(request: Request, { params }: Context) {
    const access = await getTeamAccess();
    if (!access) return refuse(401, 'Sign in to continue');

    const { path } = await params;
    const [api, version, table, ...extra] = path;
    if (api !== 'rest' || version !== 'v1' || !table || extra.length > 0 || !ALLOWED_TABLES.has(table)) {
        return refuse(404, 'Not found');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !key) return refuse(500, 'Database connection is not configured');

    const incoming = new URL(request.url);
    const method = request.method.toUpperCase();

    // An update or delete must say which rows it is for.
    if (method === 'PATCH' || method === 'DELETE') {
        const hasFilter = [...incoming.searchParams.keys()].some((name) => !NON_FILTER_PARAMS.has(name));
        if (!hasFilter) return refuse(400, 'Refusing to change every row: add a filter');
    }

    const headers = new Headers({ apikey: key, Authorization: `Bearer ${key}` });
    for (const name of FORWARDED_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }

    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
        body = await request.text();
        if (body && table === 'clients') {
            try {
                body = JSON.stringify(dropPasswords(JSON.parse(body)));
            } catch {
                return refuse(400, 'Invalid request body');
            }
        }
    }

    const upstream = await fetch(`${supabaseUrl}/rest/v1/${table}${incoming.search}`, {
        method,
        headers,
        body: body || undefined,
        cache: 'no-store',
    });

    const responseHeaders = new Headers();
    for (const name of FORWARDED_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
    }

    if (upstream.status === 204 || method === 'HEAD') {
        return new Response(null, { status: upstream.status, headers: responseHeaders });
    }

    const text = await upstream.text();
    if ((upstream.headers.get('content-type') || '').includes('json') && text) {
        try {
            return new Response(JSON.stringify(hideOtherBoards(table, hidePasswords(JSON.parse(text)), access)), {
                status: upstream.status,
                headers: responseHeaders,
            });
        } catch {
            // Not JSON after all: pass it through untouched
        }
    }
    return new Response(text, { status: upstream.status, headers: responseHeaders });
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
