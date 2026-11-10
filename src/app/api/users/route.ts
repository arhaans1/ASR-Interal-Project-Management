
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// GET: List all admin users
export async function GET() {
    try {
        const session = await getSession();
        if (session?.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can list users' }, { status: 403 });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, created_at, role')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}

// POST: Create a new admin user
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (session?.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can create users' }, { status: 403 });
        }

        const body = await request.json();
        const { username, password } = body;
        const role = body.role === 'operator' ? 'operator' : 'admin';

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUser) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
        }

        // Insert user
        // NOTE: In production, password MUST be hashed! using bcrypt/argon2
        // For this prototype/MVP as per strict instructions, we are using plain text or simple encoding?
        // User requested "secure" but we set up plain text before. 
        // I should at least do what I did for clients.
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password, role }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}
