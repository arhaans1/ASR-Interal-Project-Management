import { supabase } from '@/lib/supabase';
import { Category, FunnelType } from '@/types/database';
import { FUNNEL_TEMPLATES } from '@/lib/funnelTemplates';

// Pre-list the template tasks for a funnel type on a client's board.
// With `replace`, the card's current categories and tasks are removed first.
export async function applyFunnelTemplate(clientId: string, funnelType: FunnelType, replace = false): Promise<void> {
  const template = FUNNEL_TEMPLATES[funnelType];

  if (replace) {
    const { data: current, error: currentError } = await supabase.from('categories').select('id').eq('client_id', clientId);
    if (currentError) throw currentError;
    const ids = (current || []).map((c: any) => c.id);
    if (ids.length > 0) {
      const { error: taskError } = await supabase.from('tasks').delete().in('category_id', ids);
      if (taskError) throw taskError;
      const { error: catError } = await supabase.from('categories').delete().eq('client_id', clientId);
      if (catError) throw catError;
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from('categories')
    .select('order_index')
    .eq('client_id', clientId);
  if (existingError) throw existingError;

  const offset = (existing || []).reduce((max, c: any) => Math.max(max, (c.order_index ?? 0) + 1), 0);

  const { data: newCategories, error: catError } = await supabase
    .from('categories')
    .insert(
      template.map((cat, i) => ({
        client_id: clientId,
        name: cat.name,
        order_index: offset + i,
        due_after: cat.due_after ?? null,
        due_days: cat.due_days ?? null,
      }))
    )
    .select();
  if (catError) throw catError;

  const tasks = template.flatMap((cat, i) => {
    const created = (newCategories as Category[]).find((c) => c.order_index === offset + i);
    if (!created) return [];
    return cat.tasks.map((task, order_index) => ({
      category_id: created.id,
      name: task.name,
      completed: false,
      order_index,
      owner: task.owner,
      is_onboarding: Boolean(task.is_onboarding),
      is_approval: Boolean(task.is_approval),
      task_key: task.task_key ?? null,
    }));
  });

  const { error: taskError } = await supabase.from('tasks').insert(tasks);
  if (taskError) throw taskError;
}
