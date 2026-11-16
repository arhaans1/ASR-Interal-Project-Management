import { NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { errorBody, isAdsConfigured, listAdAccounts } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

// GET: the ad accounts assigned to the system user, for the client Edit window.
export async function GET(request: Request) {
    if (!(await getTeamSession())) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    if (!isAdsConfigured()) {
        return NextResponse.json({ configured: false, accounts: [] });
    }
    try {
        const fresh = new URL(request.url).searchParams.get('fresh') === '1';
        return NextResponse.json({ configured: true, accounts: await listAdAccounts(fresh) });
    } catch (error) {
        const { status, body } = errorBody(error);
        return NextResponse.json({ configured: true, ...body }, { status });
    }
}
