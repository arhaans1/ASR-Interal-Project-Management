import { supabase } from '@/lib/supabase';
import { SessionData } from '@/lib/auth';
import { PortalCategory, PortalClient, Task } from '@/types/database';

// Server-side helpers shared by the client portal and the operator workspace.

// Only these fields ever leave the server for the portal: no login, no internal notes.
export function toPortalClient(row: any): PortalClient {
    return {
        id: row.id,
        name: row.name,
        business_name: row.business_name,
        status: row.status,
        funnel_type: row.funnel_type ?? null,
        operator_id: row.operator_id ?? null,
        drive_folder_url: row.drive_folder_url ?? null,
        assets_folder_url: row.assets_folder_url ?? null,
        onboarding_video_url: row.onboarding_video_url ?? null,
        onboarding_form_url: row.onboarding_form_url ?? null,
        important_links: row.important_links ?? '',
        created_at: row.created_at,
    };
}

const toTask = (t: any): Task => ({
    id: t.id,
    category_id: t.category_id,
    name: t.name,
    completed: Boolean(t.completed),
    order_index: t.order_index ?? 0,
    owner: t.owner === 'client' ? 'client' : 'team',
    is_onboarding: Boolean(t.is_onboarding),
    is_approval: Boolean(t.is_approval),
    task_key: t.task_key ?? null,
    completed_at: t.completed_at ?? null,
    created_at: t.created_at,
});

// Categories with their tasks for one or more clients, in board order.
export async function fetchCategories(clientIds: string[]): Promise<PortalCategory[]> {
    if (clientIds.length === 0) return [];

    const { data, error } = await supabase
        .from('categories')
        .select('*, tasks (*)')
        .in('client_id', clientIds)
        .order('order_index');

    if (error) throw error;

    return (data || []).map((c: any) => ({
        id: c.id,
        client_id: c.client_id,
        name: c.name,
        order_index: c.order_index ?? 0,
        created_at: c.created_at,
        due_after: c.due_after ?? null,
        due_days: c.due_days ?? null,
        tasks: (c.tasks || [])
            .map(toTask)
            .sort((a: Task, b: Task) => a.order_index - b.order_index),
    }));
}

// Who may open a given client's portal data.
export function canViewClient(session: SessionData | null, client: { id: string }): boolean {
    if (!session) return false;
    // Team members and operators work across every project.
    if (session.role === 'admin' || session.role === 'operator') return true;
    return session.role === 'client' && session.clientId === client.id;
}
