import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTeamSession } from '@/lib/auth';
import { hashPassword } from '@/lib/passwords';

// GET: List all team accounts (never their passwords)
export async function GET() {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
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

// POST: Create a team member or an operator
export async function POST(request: Request) {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const body = await request.json();
        const { username, password } = body;
        const role = body.role === 'operator' ? 'operator' : 'admin';

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username);

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password: hashPassword(password), role }])
            .select('id, username, created_at, role')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}
