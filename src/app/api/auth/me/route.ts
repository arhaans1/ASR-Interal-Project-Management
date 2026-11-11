import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resolveAccess } from '@/lib/access';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ user: null }, { status: 401 });
        }
        if (session.role === 'client') {
            return NextResponse.json({ user: session });
        }
        const access = await resolveAccess(session);
        return NextResponse.json({
            user: {
                ...session,
                username: access.username,
                isAdmin: access.isAdmin,
                isOperator: access.isOperator,
                boardId: access.boardId,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}
