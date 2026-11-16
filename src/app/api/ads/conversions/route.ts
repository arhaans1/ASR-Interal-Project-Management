import { NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { errorBody, listCustomConversions, normalizeAccountId } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

// GET ?account=act_123: the account's custom conversions, for "Count results from".
export async function GET(request: Request) {
    if (!(await getTeamSession())) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    const accountId = normalizeAccountId(new URL(request.url).searchParams.get('account'));
    if (!accountId) return NextResponse.json({ error: 'Choose an ad account', code: 'bad_request' }, { status: 400 });
    try {
        return NextResponse.json({ conversions: await listCustomConversions(accountId) });
    } catch (error) {
        const { status, body } = errorBody(error);
        return NextResponse.json(body, { status });
    }
}
