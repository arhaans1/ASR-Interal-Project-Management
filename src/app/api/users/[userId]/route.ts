
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

interface Context {
    params: Promise<{ userId: string }>;
}

// PUT: Update user (password/username)
export async function PUT(
    request: Request,
    { params }: Context
) {
    try {
        const body = await request.json();
        const { username, password, role } = body;
        const { userId } = await params;

        // Admins can edit anyone; everyone else only their own login.
        const session = await getSession();
        const isAdmin = session?.role === 'admin';
        if (!session || session.role === 'client' || (!isAdmin && session.userId !== userId)) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const updates: any = {};
        if (username) updates.username = username;
        if (password) updates.password = password;
        if (isAdmin && (role === 'admin' || role === 'operator')) updates.role = role;

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
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

// DELETE: Remove a user
export async function DELETE(
    request: Request,
    { params }: Context
) {
    try {
        const { userId } = await params;

        const session = await getSession();
        if (session?.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can remove users' }, { status: 403 });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}
