import { createSession } from '@/lib/auth';
import { isSessionSecretConfigured } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/passwords';
import { supabase } from '@/lib/supabase';
import { roleIsOperator } from '@/lib/access';
import { NextResponse } from 'next/server';

// Find the row whose stored password matches. Rows still holding a plain password
// are switched to a hash the first time they sign in.
async function findMatch(table: 'users' | 'clients', username: string, password: string) {
    const { data: rows, error } = await supabase.from(table).select('*').eq('username', username);
    if (error) throw error;

    for (const row of rows || []) {
        const { ok, needsUpgrade } = verifyPassword(password, row.password);
        if (!ok) continue;
        if (needsUpgrade) {
            await supabase.from(table).update({ password: hashPassword(password) }).eq('id', row.id);
        }
        return row;
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        if (!isSessionSecretConfigured()) {
            return NextResponse.json(
                { error: 'Sign-in is not configured: set SESSION_SECRET in the server environment.' },
                { status: 500 }
            );
        }

        // 1. Team accounts first
        const teamUser = await findMatch('users', username, password);
        if (teamUser) {
            // The cookie only records whether this person has an operator dashboard.
            // Admin rights are read from the account each time they are needed.
            const role = roleIsOperator(teamUser.role) ? 'operator' : 'admin';
            await createSession({
                userId: teamUser.id,
                role,
                username: teamUser.username,
            });
            return NextResponse.json({ success: true, role });
        }

        // 2. Client portal logins
        const clientUser = await findMatch('clients', username, password);
        if (clientUser) {
            await createSession({
                userId: clientUser.id,
                role: 'client',
                clientId: clientUser.id,
                username: clientUser.username || clientUser.name,
            });
            return NextResponse.json({ success: true, role: 'client', clientId: clientUser.id });
        }

        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
