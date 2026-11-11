import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { fetchCategories, toPortalClient } from '@/lib/portalData';

// GET: the operator workspace — the client projects assigned to the signed-in operator.
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'operator') {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const { data: rows, error } = await supabase
            .from('clients')
            .select('*')
            .in('status', ['Active', 'Launched'])
            .eq('operator_id', session.userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const clients = (rows || []).map(toPortalClient);
        const categories = await fetchCategories(clients.map((c) => c.id));

        return NextResponse.json({
            viewer: { role: session.role, userId: session.userId, username: session.username },
            clients: clients.map((client) => ({
                client,
                categories: categories.filter((c) => c.client_id === client.id),
            })),
        });
    } catch (error) {
        console.error('Operator workspace error:', error);
        return NextResponse.json({ error: 'Unable to load clients' }, { status: 500 });
    }
}
