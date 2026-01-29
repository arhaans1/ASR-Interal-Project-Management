
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
        const { username, password } = body;
        const { userId } = await params;

        const updates: any = {};
        if (username) updates.username = username;
        if (password) updates.password = password;

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
