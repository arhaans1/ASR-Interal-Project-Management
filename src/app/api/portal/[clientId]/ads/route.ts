import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { canViewClient } from '@/lib/portalData';
import { AdsError, buildReport, configFromClient, errorBody, validateSelection } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

interface Context {
    params: Promise<{ clientId: string }>;
}

// GET ?since=yyyy-MM-dd&until=yyyy-MM-dd&preset=…[&fresh=1][&as=client]
// Ad performance for one client. The ad account comes from the client's card, never from the
// request, so a client can only ever see their own. The team gets campaign and ad detail too.
export async function GET(request: Request, { params }: Context) {
    try {
        const { clientId } = await params;
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

        const { data: row, error } = await supabase.from('clients').select('*').eq('id', clientId).maybeSingle();
        if (error) throw error;
        if (!row || !canViewClient(session, row)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const config = configFromClient(row);
        if (!config) {
            throw new AdsError('not_linked', 'No Meta ad account is linked to this client yet.', 404);
        }

        const search = new URL(request.url).searchParams;
        const selection = validateSelection(search.get('preset'), search.get('since'), search.get('until'));
        // Clients always get the client view. The team can ask for it too (portal preview).
        const audience = session.role === 'client' || search.get('as') === 'client' ? 'client' : 'team';
        const report = await buildReport(config, selection, audience, search.get('fresh') === '1');

        return NextResponse.json(report);
    } catch (error) {
        const { status, body } = errorBody(error);
        return NextResponse.json(body, { status });
    }
}
