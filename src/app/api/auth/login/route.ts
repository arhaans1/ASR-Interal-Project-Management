
import { createSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // 1. Check Admin Users first
        const { data: adminUser, error: adminError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (adminUser) {
            // Operators get their own workspace; every other team account is an admin.
            const role = adminUser.role === 'operator' ? 'operator' : 'admin';
            await createSession({
                userId: adminUser.id,
                role,
                username: adminUser.username,
            });
            return NextResponse.json({ success: true, role });
        }

        // 2. Check Client Users
        const { data: clientUser, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('username', username)
            .eq('password', password) // In production, hash this!
            .single();

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
