'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Client, ClientStatus, Category, Task } from '@/types/database';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data as Client[]) || []);
    } catch (err) {
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

      if (error) throw error;
      const clientData = data as Client;
      setClients((prev) => [clientData, ...prev]);
      return clientData;
    } catch (err) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
      return false;
    }
  };

  const cloneClient = async (client: Client): Promise<Client | null> => {
    try {
      // Generate copy name
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

      // Create new client
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

      // Fetch categories for the original client
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('client_id', client.id)
        .order('order_index');

      if (catError) throw catError;

      // Clone categories and tasks
      for (const category of (categories as Category[]) || []) {
        const { data: newCategory, error: newCatError } = await supabase
          .from('categories')
          .insert({
            client_id: clonedClient.id,
            name: category.name,
            order_index: category.order_index,
          })
          .select()
          .single();

        if (newCatError) throw newCatError;

        const clonedCategory = newCategory as Category;

        // Fetch tasks for this category
        const { data: tasks, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('category_id', category.id)
          .order('order_index');

        if (taskError) throw taskError;

        // Clone tasks
        for (const task of (tasks as Task[]) || []) {
          const { error: newTaskError } = await supabase.from('tasks').insert({
            category_id: clonedCategory.id,
            name: task.name,
            completed: false, // Reset completion status
            order_index: task.order_index,
          });

          if (newTaskError) throw newTaskError;
        }
      }

      setClients((prev) => [clonedClient, ...prev]);
      return clonedClient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone client');
      return null;
    }
  };

  return {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    cloneClient,
    refreshClients: fetchClients,
  };
}
