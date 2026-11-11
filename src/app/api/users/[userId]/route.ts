import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/auth';
import { forgetAccess, getTeamAccess, roleIsAdmin, roleIsOperator } from '@/lib/access';
import { hashPassword } from '@/lib/passwords';

// True when this account is the only one with admin rights.
async function isLastAdmin(userId: string): Promise<boolean> {
    const { data } = await supabase.from('users').select('id, role');
    const admins = (data || []).filter((u: any) => roleIsAdmin(u.role));
    return admins.length === 1 && admins[0].id === userId;
}

interface Context {
    params: Promise<{ userId: string }>;
}

// PUT: Update a team account (username, password, role)
export async function PUT(
    request: Request,
    { params }: Context
) {
    try {
        const session = await getTeamAccess();
        const { userId } = await params;
        // Admins can edit anyone. Everyone else can change their own username and password.
        if (!session || (!session.isAdmin && session.userId !== userId)) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const body = await request.json();
        const { username, password, role } = body;

        const updates: any = {};
        if (username) updates.username = username;
        if (password) updates.password = hashPassword(password);
        if (session.isAdmin && ['admin', 'operator', 'member', 'member_operator'].includes(role)) {
            if (!roleIsAdmin(role) && (await isLastAdmin(userId))) {
                return NextResponse.json({ error: 'This is the only admin. Make someone else an admin first.' }, { status: 400 });
            }
            updates.role = role;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }

        if (updates.username) {
            const { data: clash } = await supabase
                .from('users')
                .select('id')
                .eq('username', updates.username);
            if ((clash || []).some((u: any) => u.id !== userId)) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            }
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select('id, username, created_at, role')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        forgetAccess(userId);

        // Editing your own account: refresh the session so the change applies straight away.
        if (session.userId === userId) {
            await createSession({
                userId,
                role: roleIsOperator(data.role) ? 'operator' : 'admin',
                username: data.username,
            });
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

        const session = await getTeamAccess();
        if (!session?.isAdmin) {
            return NextResponse.json({ error: 'Only admins can remove users' }, { status: 403 });
        }
        if (session.userId === userId) {
            return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 });
        }

        forgetAccess(userId);

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
