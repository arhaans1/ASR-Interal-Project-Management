import { NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { detectResultEvents, errorBody, listCustomConversions, normalizeAccountId } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

// GET ?account=act_123[&filter=…]: for the Edit window's result checklist —
// the account's custom conversions, and what its ad sets optimised for in the last 90 days.
export async function GET(request: Request) {
    if (!(await getTeamSession())) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    const accountId = normalizeAccountId(params.get('account'));
    if (!accountId) return NextResponse.json({ error: 'Choose an ad account', code: 'bad_request' }, { status: 400 });
    const campaignFilter = params.get('filter')?.trim() || null;

    const [conversions, detected] = await Promise.allSettled([
        listCustomConversions(accountId),
        detectResultEvents({ accountId, campaignFilter }),
    ]);
    if (conversions.status === 'rejected' && detected.status === 'rejected') {
        const { status, body } = errorBody(conversions.reason);
        return NextResponse.json(body, { status });
    }
    return NextResponse.json({
        conversions: conversions.status === 'fulfilled' ? conversions.value : [],
        conversionsError: conversions.status === 'rejected' ? errorBody(conversions.reason).body.error : null,
        detected: detected.status === 'fulfilled' ? detected.value : [],
        detectedError: detected.status === 'rejected' ? errorBody(detected.reason).body.error : null,
    });
}
