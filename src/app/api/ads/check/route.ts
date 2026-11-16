import { NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { checkConnection, configFromClient, errorBody } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

// GET ?account=&type=&events=&filter= : last 7 days for these settings ("Test connection").
export async function GET(request: Request) {
    if (!(await getTeamSession())) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    const config = configFromClient({
        meta_ad_account_id: params.get('account'),
        meta_result_type: params.get('type'),
        meta_result_action: params.get('events') ?? params.get('action'),
        meta_campaign_filter: params.get('filter'),
    });
    if (!config) return NextResponse.json({ error: 'Choose an ad account', code: 'bad_request' }, { status: 400 });
    try {
        return NextResponse.json(await checkConnection(config));
    } catch (error) {
        const { status, body } = errorBody(error);
        return NextResponse.json(body, { status });
    }
}
