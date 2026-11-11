'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Client, ClientStatus, Category, FunnelType, Task } from '@/types/database';
import { FUNNEL_TEMPLATES } from '@/lib/funnelTemplates';

// The extra fields on a client card. Only sent to the database when they are set,
// so plain client cards keep working exactly as before.
export interface ClientExtras {
  funnel_type?: FunnelType | null;
  operator_id?: string | null;
  drive_folder_url?: string | null;
  onboarding_video_url?: string | null;
  onboarding_form_url?: string | null;
}

const definedExtras = (extras: ClientExtras) =>
  Object.fromEntries(Object.entries(extras).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// Portal passwords are hashed on the server, so they are set through the API rather
// than written to the table from the browser.
export async function setClientPassword(clientId: string, password: string): Promise<void> {
  const res = await fetch(`/api/clients/${clientId}/credentials`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not set the portal password');
  }
}

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

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched clients:', data); // Debug log
      setClients((data as Client[]) || []);
    } catch (err: any) {
      console.error('Error fetching clients:', err); // Debug log
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'Failed to fetch clients');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (
    name: string,
    businessName: string,
    status: ClientStatus,
    username?: string,
    password?: string,
    extras: ClientExtras = {}
  ): Promise<Client | null> => {
    try {
      console.log('Creating client:', { name, businessName, status }); // Debug log
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name,
          business_name: businessName,
          status,
          important_links: '',
          notes: '',
          username: username || null,
          ...definedExtras(extras),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error); // Debug log
        throw error;
      }

      const clientData = data as Client;
      if (password) {
        await setClientPassword(clientData.id, password);
      }
      if (extras.funnel_type) {
        await applyFunnelTemplate(clientData.id, extras.funnel_type);
      }
      console.log('Client created:', clientData); // Debug log
      setClients((prev) => [clientData, ...prev]);
      return clientData;
    } catch (err: any) {
      console.error('Error creating client:', err); // Debug log
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'Failed to create client');
      setError(errorMessage);
      return null;
    }
  };

  const updateClient = async (
    id: string,
    updates: Partial<Omit<Client, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    try {
      // A new password goes through the server, where it is hashed.
      const { password, ...fields } = updates;

      const { error } = await supabase
        .from('clients')
        .update(fields)
        .eq('id', id);

      if (error) throw error;
      if (password) {
        await setClientPassword(id, password);
      }
      setClients((prev) =>
        prev.map((client) =>
          client.id === id
            ? { ...client, ...fields, ...(password ? { password: 'set' } : {}) }
            : client
        )
      );
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'Failed to update client');
      setError(errorMessage);
      return false;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) throw error;
      setClients((prev) => prev.filter((client) => client.id !== id));
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'Failed to delete client');
      setError(errorMessage);
      return false;
    }
  };

  const cloneClient = async (client: Client): Promise<Client | null> => {
    try {
      setIsCloning(true);
      // 1. Generate new name
      const baseName = client.name.replace(/-copy\d*$/, '');
      const existingCopies = clients.filter(
        (c) => c.name.startsWith(baseName + '-copy') || c.name === baseName + '-copy'
      );

      let copyName: string;
      if (existingCopies.length === 0) {
        copyName = `${baseName}-copy`;
      } else {
        const numbers = existingCopies
          .map((c) => {
            const match = c.name.match(/-copy(\d*)$/);
            if (match) {
              return match[1] ? parseInt(match[1], 10) : 0;
            }
            return -1;
          })
          .filter((n) => n >= 0);
        const maxNum = Math.max(...numbers, 0);
        copyName = `${baseName}-copy${maxNum + 1}`;
      }

      // 2. Fetch ALL original data (Categories + Tasks) in ONE query
      const { data: originalData, error: fetchError } = await supabase
        .from('categories')
        .select(`
          *,
          tasks (*)
        `)
        .eq('client_id', client.id)
        .order('order_index');

      if (fetchError) throw fetchError;

      // 3. Create New Client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: copyName,
          business_name: client.business_name,
          status: client.status,
          important_links: client.important_links,
          notes: client.notes,
          // The Drive folder, video and worksheet belong to the original client, so only the
          // funnel type and operator carry over.
          ...definedExtras({ funnel_type: client.funnel_type, operator_id: client.operator_id }),
        })
        .select()
        .single();

      if (clientError) throw clientError;
      const clonedClient = newClient as Client;

      // 4. Bulk Insert Categories
      // We need to map old Category ID -> New Category ID to insert tasks correctly
      const categoriesToInsert = (originalData || []).map((cat: any) => ({
        client_id: clonedClient.id,
        name: cat.name,
        order_index: cat.order_index,
        // Keep the timeline rule when the source board has one
        ...(cat.due_after ? { due_after: cat.due_after, due_days: cat.due_days } : {}),
      }));

      if (categoriesToInsert.length > 0) {
        const { data: newCategories, error: catInsertError } = await supabase
          .from('categories')
          .insert(categoriesToInsert)
          .select();

        if (catInsertError) throw catInsertError;

        // 5. Bulk Insert Tasks
        // Match new categories to old categories by order_index (assuming order is preserved and unique enough for this context)
        // A safer way is to map by name+index or just use the returning order if we trust Supabase returns in same insertion order (usually yes for bulk, but not guaranteed).
        // Let's rely on matching 'name' and 'order_index' to find the corresponding old category.

        const tasksToInsert: any[] = [];

        // originalData has the tasks. newCategories has the new IDs.
        // We iterate through originalData, find the matching new Category, and prepare tasks.

        (originalData || []).forEach((oldCat: any) => {
          const matchingNewCat = (newCategories as Category[]).find(
            nc => nc.name === oldCat.name && nc.order_index === oldCat.order_index
          );

          if (matchingNewCat && oldCat.tasks && oldCat.tasks.length > 0) {
            oldCat.tasks.forEach((task: Task) => {
              tasksToInsert.push({
                category_id: matchingNewCat.id,
                name: task.name,
                completed: false,
                order_index: task.order_index,
                // Keep who-does-what when the source board uses it
                ...(task.owner === 'client'
                  ? { owner: 'client', is_onboarding: Boolean(task.is_onboarding), task_key: task.task_key ?? null }
                  : {}),
                ...(task.is_approval ? { is_approval: true } : {}),
              });
            });
          }
        });

        if (tasksToInsert.length > 0) {
          const { error: taskInsertError } = await supabase
            .from('tasks')
            .insert(tasksToInsert);

          if (taskInsertError) throw taskInsertError;
        }
      }

      setClients((prev) => [clonedClient, ...prev]);
      return clonedClient;
    } catch (err: any) {
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'Failed to clone client');
      setError(errorMessage);
      return null;
    } finally {
      setIsCloning(false);
    }
  };

  return {
    clients,
    loading,
    isCloning, // Export state
    error,
    createClient,
    updateClient,
    deleteClient,
    cloneClient,
    refreshClients: fetchClients,
  };
}
