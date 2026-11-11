import { NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { isUsernameTaken } from '@/lib/usernames';

// GET /api/clients/username?username=abc&exclude=<clientId>
// Says whether a portal username is already used by a client or a team member.
export async function GET(request: Request) {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }
        const params = new URL(request.url).searchParams;
        const taken = await isUsernameTaken(params.get('username') || '', params.get('exclude') || undefined);
        return NextResponse.json({ taken });
    } catch (error) {
        console.error('Username check error:', error);
        return NextResponse.json({ error: 'Unable to check the username' }, { status: 500 });
    }
}
