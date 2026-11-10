import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { canViewClient, fetchCategories, toPortalClient } from '@/lib/portalData';

interface Context {
    params: Promise<{ clientId: string }>;
}

// GET: everything the client portal needs for one client
export async function GET(_request: Request, { params }: Context) {
    try {
        const { clientId } = await params;
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        }

        const { data: row, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .maybeSingle();

        if (error) throw error;
        if (!row || !canViewClient(session, row)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        let operatorName: string | null = null;
        if (row.operator_id) {
            const { data: operator } = await supabase
                .from('users')
                .select('username')
                .eq('id', row.operator_id)
                .maybeSingle();
            operatorName = operator?.username ?? null;
        }

        const categories = await fetchCategories([clientId]);

        return NextResponse.json({
            client: toPortalClient(row),
            operatorName,
            categories,
            viewer: { role: session.role, username: session.username },
        });
    } catch (error) {
        console.error('Portal load error:', error);
        return NextResponse.json({ error: 'Unable to load project data' }, { status: 500 });
    }
}
