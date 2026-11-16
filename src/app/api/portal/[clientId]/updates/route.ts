import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

interface Context {
    params: Promise<{ clientId: string }>;
}

// POST: the client opened their Updates inbox, so everything up to now is read.
// The team's portal preview leaves the client's unread updates alone.
export async function POST(_request: Request, { params }: Context) {
    try {
        const { clientId } = await params;
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        if (session.role !== 'client') return NextResponse.json({ readAt: null, preview: true });
        if (session.clientId !== clientId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const readAt = new Date().toISOString();
        const { error } = await supabase.from('clients').update({ updates_read_at: readAt }).eq('id', clientId);
        if (error) throw error;
        return NextResponse.json({ readAt });
    } catch (error) {
        console.error('Updates read error:', error);
        return NextResponse.json({ error: 'Could not update' }, { status: 500 });
    }
}
