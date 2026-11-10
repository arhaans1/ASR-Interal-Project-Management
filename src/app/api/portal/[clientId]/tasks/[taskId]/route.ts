import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { canViewClient } from '@/lib/portalData';

interface Context {
    params: Promise<{ clientId: string; taskId: string }>;
}

// PATCH: tick or untick a task.
// Clients can only tick their own tasks; operators and admins can tick any task on the client.
// The team workspace reads the same row, so a tick here shows up there too.
export async function PATCH(request: Request, { params }: Context) {
    try {
        const { clientId, taskId } = await params;
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        }

        const body = await request.json();
        if (typeof body.completed !== 'boolean') {
            return NextResponse.json({ error: 'completed must be true or false' }, { status: 400 });
        }

        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .maybeSingle();

        if (clientError) throw clientError;
        if (!client || !canViewClient(session, client)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .maybeSingle();

        if (taskError) throw taskError;
        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // The task must sit on this client's board.
        const { data: category } = await supabase
            .from('categories')
            .select('client_id')
            .eq('id', task.category_id)
            .maybeSingle();

        if (!category || category.client_id !== clientId) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        if (session.role === 'client' && task.owner !== 'client') {
            return NextResponse.json({ error: 'This task is handled by the ASR team' }, { status: 403 });
        }

        const completed_at = body.completed ? new Date().toISOString() : null;
        const { data: updated, error: updateError } = await supabase
            .from('tasks')
            .update({ completed: body.completed, completed_at })
            .eq('id', taskId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({
            id: updated.id,
            completed: updated.completed,
            completed_at: updated.completed_at,
        });
    } catch (error) {
        console.error('Task update error:', error);
        return NextResponse.json({ error: 'Unable to update the task' }, { status: 500 });
    }
}
