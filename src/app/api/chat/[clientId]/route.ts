
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTeamSession } from '@/lib/auth';

interface Context {
    params: Promise<{ clientId: string }>;
}

// GET: Fetch messages for a client
export async function GET(
    request: Request,
    { params }: Context
) {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }
        const { clientId } = await params;

        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true }); // Oldest first for chat history

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Chat Error' }, { status: 500 });
    }
}

// POST: Send a new message
export async function POST(
    request: Request,
    { params }: Context
) {
    try {
        if (!(await getTeamSession())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }
        const { clientId } = await params;
        const body = await request.json();
        const { user_id, username, content, attachments } = body;

        if (!content && (!attachments || attachments.length === 0)) {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('chat_messages')
            .insert([{
                client_id: clientId,
                user_id,
                username,
                content,
                attachments: attachments || []
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Chat Error' }, { status: 500 });
    }
}
