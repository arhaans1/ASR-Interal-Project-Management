import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTeamSession } from '@/lib/auth';

interface Context {
    params: Promise<{ clientId: string }>;
}

// DELETE: remove a client and everything on its card (phases, tasks, chat, quick notes).
// Tasks on team boards that were tagged with this client are kept, just untagged:
// the database would otherwise refuse the delete because they still point at it.
export async function DELETE(_request: Request, { params }: Context) {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const { clientId } = await params;

        const { error: untagError } = await supabase.from('tasks').update({ origin_client_id: null }).eq('origin_client_id', clientId);
        if (untagError) throw untagError;

        const { data, error } = await supabase.from('clients').delete().eq('id', clientId).select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'That client no longer exists' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete client error:', error);
        return NextResponse.json({ error: error?.message || 'Unable to delete the client' }, { status: 500 });
    }
}
