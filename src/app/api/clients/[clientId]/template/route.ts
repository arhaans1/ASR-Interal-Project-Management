import { NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { applyFunnelTemplate } from '@/lib/funnelSetup';
import { FUNNEL_TEMPLATES } from '@/lib/funnelTemplates';
import { FunnelType } from '@/types/database';

interface Context {
    params: Promise<{ clientId: string }>;
}

// POST: add (or, with replace, swap in) a funnel's task template on a client card.
// It runs here, on the server, so the tasks always come from the version that is live,
// even when the person has an older copy of the app open in their browser.
export async function POST(request: Request, { params }: Context) {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const { clientId } = await params;
        const { funnelType, replace } = await request.json();

        if (typeof funnelType !== 'string' || !(funnelType in FUNNEL_TEMPLATES)) {
            return NextResponse.json({ error: 'Choose CAM, VSL or Webinar' }, { status: 400 });
        }

        await applyFunnelTemplate(clientId, funnelType as FunnelType, Boolean(replace));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Template error:', error);
        return NextResponse.json({ error: error?.message || 'Unable to add the template tasks' }, { status: 500 });
    }
}
