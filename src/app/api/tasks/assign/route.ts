import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTeamAccess, TEAM_BOARD_STATUS } from '@/lib/access';

// POST: assign a task to a team member.
// The task is marked with the assignee and a copy lands on that person's own board. Done on
// the server so anyone can hand a task to a colleague without being able to read their board.
export async function POST(request: Request) {
    try {
        if (!(await getTeamAccess())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }

        const { taskId, boardId } = await request.json();
        if (!taskId || !boardId) {
            return NextResponse.json({ error: 'taskId and boardId are required' }, { status: 400 });
        }

        const [{ data: task }, { data: board }] = await Promise.all([
            supabase.from('tasks').select('*').eq('id', taskId).maybeSingle(),
            supabase.from('clients').select('id, name, status').eq('id', boardId).maybeSingle(),
        ]);
        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        if (!board || board.status !== TEAM_BOARD_STATUS) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        const previousBoardId: string | null = task.assigned_to ?? null;
        if (previousBoardId === boardId) {
            return NextResponse.json({ success: true, assignedTo: board.name });
        }

        const { data: sourceCategory } = await supabase
            .from('categories')
            .select('client_id')
            .eq('id', task.category_id)
            .maybeSingle();

        const { error: updateError } = await supabase.from('tasks').update({ assigned_to: boardId }).eq('id', taskId);
        if (updateError) throw updateError;

        // The copy goes into the person's "Tasks" list, or their first list, or a new one.
        const { data: lists } = await supabase
            .from('categories')
            .select('id, name')
            .eq('client_id', boardId)
            .order('order_index');

        let targetCategoryId = (lists || []).find((c: any) => c.name === 'Tasks')?.id ?? (lists || [])[0]?.id;
        if (!targetCategoryId) {
            const { data: created, error: createError } = await supabase
                .from('categories')
                .insert({ client_id: boardId, name: 'Tasks', order_index: 0 })
                .select()
                .single();
            if (createError) throw createError;
            targetCategoryId = created.id;
        }

        const { error: insertError } = await supabase.from('tasks').insert({
            category_id: targetCategoryId,
            name: task.name,
            completed: false,
            order_index: 9999,
            origin_client_id: sourceCategory?.client_id ?? null,
        });
        if (insertError) throw insertError;

        // Reassigned: take the copy off the previous person's board.
        if (previousBoardId) {
            const { data: oldLists } = await supabase.from('categories').select('id').eq('client_id', previousBoardId);
            const oldIds = (oldLists || []).map((c: any) => c.id);
            if (oldIds.length > 0) {
                await supabase.from('tasks').delete().in('category_id', oldIds).eq('name', task.name);
            }
        }

        return NextResponse.json({ success: true, assignedTo: board.name });
    } catch (error) {
        console.error('Assign error:', error);
        return NextResponse.json({ error: 'Unable to assign the task' }, { status: 500 });
    }
}
