'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Client, ClientStatus, Category, Task } from '@/types/database';

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
    } catch (err) {
      console.error('Error fetching clients:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
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
    status: ClientStatus
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
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error); // Debug log
        throw error;
      }

      const clientData = data as Client;
      console.log('Client created:', clientData); // Debug log
      setClients((prev) => [clientData, ...prev]);
      return clientData;
    } catch (err) {
      console.error('Error creating client:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Failed to create client');
      return null;
    }
  };

  const updateClient = async (
    id: string,
    updates: Partial<Omit<Client, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setClients((prev) =>
        prev.map((client) =>
          client.id === id ? { ...client, ...updates } : client
        )
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
      return false;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) throw error;
      setClients((prev) => prev.filter((client) => client.id !== id));
      return true;
      setClients((prev) => prev.filter((client) => client.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
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
                order_index: task.order_index
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone client');
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
