import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTeamSession } from '@/lib/auth';
import { hashPassword } from '@/lib/passwords';

interface Context {
    params: Promise<{ clientId: string }>;
}

// PUT: set a client's portal password. It is hashed here, on the server,
// so the password itself is never stored.
export async function PUT(request: Request, { params }: Context) {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const { clientId } = await params;
        const { password } = await request.json();

        if (!password || typeof password !== 'string') {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('clients')
            .update({ password: hashPassword(password) })
            .eq('id', clientId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Unable to set the password' }, { status: 500 });
    }
}
