import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { fetchCategories, toPortalClient } from '@/lib/portalData';

// GET: the operator workspace.
// Operators get the clients assigned to them. Admins get every client project and the operator list.
export async function GET() {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        let query = supabase
            .from('clients')
            .select('*')
            .in('status', ['Active', 'Launched'])
            .order('created_at', { ascending: false });

        if (session.role === 'operator') {
            query = query.eq('operator_id', session.userId);
        }

        const { data: rows, error } = await query;
        if (error) throw error;

        const clients = (rows || []).map(toPortalClient);
        const categories = await fetchCategories(clients.map((c) => c.id));

        const { data: operators } = await supabase
            .from('users')
            .select('id, username')
            .eq('role', 'operator')
            .order('username');

        return NextResponse.json({
            viewer: { role: session.role, userId: session.userId, username: session.username },
            operators: operators || [],
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
