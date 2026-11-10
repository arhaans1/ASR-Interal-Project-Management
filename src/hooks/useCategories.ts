'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Category, Task } from '@/types/database';

export interface CategoryWithTasks extends Category {
  tasks: Task[];
}

export function useCategories(clientId: string | null) {
  const [categories, setCategories] = useState<CategoryWithTasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `silent` refreshes in the background without swapping the board for a spinner.
  const fetchCategories = useCallback(async (silent = false) => {
    if (!clientId) {
      setCategories([]);
      return;
    }

    try {
      if (!silent) setLoading(true);

      // Step 1: Fetch Categories
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('client_id', clientId)
        .order('order_index');

      if (catError) throw catError;

      const categories = (categoriesData as Category[]) || [];

      if (categories.length === 0) {
        setCategories([]);
        return;
      }

      // Step 2: Fetch Tasks for these categories in one batch
      const categoryIds = categories.map(c => c.id);

      // We need to fetch assigned_to relation.
      // Fetch assigned_to relation AND origin_client_id relation.
      // Supabase Join: assigned_to (id, name), origin_client_id (id, name)
      const { data: tasksData, error: taskError } = await supabase
        .from('tasks')
        .select(`
            *,
            assigned_client:assigned_to(name),
            origin_client:origin_client_id(name)
        `)
        .in('category_id', categoryIds)
        .order('order_index');

      if (taskError) throw taskError;

      // Transform result to match Task interface (flatten assigned_client.name and origin_client.name)
      const tasks = (tasksData || []).map((t: any) => ({
        ...t,
        assigned_user_name: t.assigned_client?.name || null,
        origin_client_name: t.origin_client?.name || null
      })) as Task[];

      // Step 3: Merge in memory
      const categoriesWithTasks: CategoryWithTasks[] = categories.map(category => ({
        ...category,
        tasks: tasks.filter(t => t.category_id === category.id)
      }));

      setCategories(categoriesWithTasks);
    } catch (err: any) {
      // A failed background refresh keeps the board as it is.
      if (silent) return;
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to fetch categories');
      setError(errorMessage);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Clients tick tasks in their portal. Pull those ticks in while this board is open.
  useEffect(() => {
    if (!clientId) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') fetchCategories(true);
    };
    const interval = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [clientId, fetchCategories]);

  const createCategory = async (name: string): Promise<Category | null> => {
    if (!clientId) return null;

    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map((c) => c.order_index))
        : -1;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          client_id: clientId,
          name,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const categoryData = data as Category;
      setCategories((prev) => [...prev, { ...categoryData, tasks: [] }]);
      return categoryData;
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to create category');
      setError(errorMessage);
      return null;
    }
  };

  const updateCategory = async (
    categoryId: string,
    name: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', categoryId);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId ? { ...cat, name } : cat
        )
      );
      return true;
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to update category');
      setError(errorMessage);
      return false;
    }
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
      return true;
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to delete category');
      setError(errorMessage);
      return false;
    }
  };

  const reorderCategory = async (categoryId: string, newIndex: number): Promise<boolean> => {
    try {
      // Optimistic update
      setCategories((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === categoryId);
        if (oldIndex === -1) return prev;

        const newCategories = [...prev];
        const [removed] = newCategories.splice(oldIndex, 1);
        newCategories.splice(newIndex, 0, removed);

        // Update order_index for all items locally
        return newCategories.map((c, idx) => ({
          ...c,
          order_index: idx,
        }));
      });

      // Prepare updates for DB
      // We need to calculate the new order based on the current state (which we just updated optimistically?)
      // Actually, we can just calculate it from the 'categories' state, but 'categories' inside this function 
      // refers to the closure value. We should re-calculate locally.

      const oldIndex = categories.findIndex((c) => c.id === categoryId);
      if (oldIndex === -1) return false;

      const newItems = [...categories];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);

      // Create batch updates
      const updates = newItems.map((c, idx) => ({
        id: c.id,
        order_index: idx,
        // We must include other required fields if using UPSERT, or just update using ID?
        // Supabase `upsert` needs primary key.
        // But `upsert` replaces the row. We only want to update `order_index`.
        // Supabase client doesn't support bulk update with different values easily.
        // We have to loop.
      }));

      // For a small number of categories, Promise.all is acceptable.
      await Promise.all(
        updates.map((update) =>
          supabase
            .from('categories')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        )
      );

      return true;
    } catch (err) {
      // Revert is hard without saving previous state, but we can just refetch
      console.error('Reorder failed', err);
      fetchCategories();
      return false;
    }
  };

  const createTask = async (
    categoryId: string,
    name: string
  ): Promise<Task | null> => {
    try {
      const category = categories.find((c) => c.id === categoryId);
      const maxOrder = category && category.tasks.length > 0
        ? Math.max(...category.tasks.map((t) => t.order_index))
        : -1;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          category_id: categoryId,
          name,
          completed: false,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const taskData = data as Task;
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? { ...cat, tasks: [...cat.tasks, taskData] }
            : cat
        )
      );
      return taskData;
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to create task');
      setError(errorMessage);
      return null;
    }
  };

  const updateTask = async (
    categoryId: string,
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'created_at' | 'category_id'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? {
              ...cat,
              tasks: cat.tasks.map((task) =>
                task.id === taskId ? { ...task, ...updates } : task
              ),
            }
            : cat
        )
      );
      return true;
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to update task');
      setError(errorMessage);
      return false;
    }
  };

  const deleteTask = async (
    categoryId: string,
    taskId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? { ...cat, tasks: cat.tasks.filter((t) => t.id !== taskId) }
            : cat
        )
      );
      return true;
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to delete task');
      setError(errorMessage);
      return false;
    }
  };

  const reorderTask = async (
    categoryId: string,
    taskId: string,
    newIndex: number
  ): Promise<boolean> => {
    try {
      setCategories((prev) => {
        const categoryIndex = prev.findIndex((c) => c.id === categoryId);
        if (categoryIndex === -1) return prev;

        const category = prev[categoryIndex];
        const oldIndex = category.tasks.findIndex((t) => t.id === taskId);
        if (oldIndex === -1) return prev;

        const newTasks = [...category.tasks];
        const [removed] = newTasks.splice(oldIndex, 1);
        newTasks.splice(newIndex, 0, removed);

        const updatedCategory = {
          ...category,
          tasks: newTasks.map((t, idx) => ({ ...t, order_index: idx })),
        };

        const newCategories = [...prev];
        newCategories[categoryIndex] = updatedCategory;
        return newCategories;
      });

      const category = categories.find((c) => c.id === categoryId);
      if (!category) return false;

      const oldIndex = category.tasks.findIndex((t) => t.id === taskId);
      if (oldIndex === -1) return false;

      const newTasks = [...category.tasks];
      const [removed] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, removed);

      const updates = newTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx,
      }));

      await Promise.all(
        updates.map((update) =>
          supabase
            .from('tasks')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        )
      );

      return true;
    } catch (err) {
      console.error('Reorder task failed', err);
      fetchCategories();
      return false;
    }
  };

  const toggleTask = async (
    categoryId: string,
    taskId: string,
    completed: boolean
  ): Promise<boolean> => {
    const ok = await updateTask(categoryId, taskId, { completed });
    // completed_at drives the client's timeline. It is written separately so ticking
    // still works on a database that has not had the onboarding migration applied yet.
    if (ok) {
      const completed_at = completed ? new Date().toISOString() : null;
      const { error } = await supabase.from('tasks').update({ completed_at }).eq('id', taskId);
      if (!error) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId
              ? { ...cat, tasks: cat.tasks.map((t) => (t.id === taskId ? { ...t, completed_at } : t)) }
              : cat
          )
        );
      }
    }
    return ok;
  };


  const moveTask = async (
    sourceCategoryId: string,
    targetCategoryId: string,
    taskId: string,
    newIndex: number
  ): Promise<boolean> => {
    try {
      if (sourceCategoryId === targetCategoryId) {
        return reorderTask(sourceCategoryId, taskId, newIndex);
      }

      setCategories((prev) => {
        const sourceCatIndex = prev.findIndex((c) => c.id === sourceCategoryId);
        const targetCatIndex = prev.findIndex((c) => c.id === targetCategoryId);
        if (sourceCatIndex === -1 || targetCatIndex === -1) return prev;

        const sourceCategory = prev[sourceCatIndex];
        const targetCategory = prev[targetCatIndex];

        const taskIndex = sourceCategory.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return prev;

        const taskToMove = { ...sourceCategory.tasks[taskIndex], category_id: targetCategoryId };

        const newSourceTasks = [...sourceCategory.tasks];
        newSourceTasks.splice(taskIndex, 1);

        const newTargetTasks = [...targetCategory.tasks];
        newTargetTasks.splice(newIndex, 0, taskToMove);

        const newCategories = [...prev];
        newCategories[sourceCatIndex] = {
          ...sourceCategory,
          tasks: newSourceTasks.map((t, idx) => ({ ...t, order_index: idx })),
        };
        newCategories[targetCatIndex] = {
          ...targetCategory,
          tasks: newTargetTasks.map((t, idx) => ({ ...t, order_index: idx })),
        };

        return newCategories;
      });

      const sourceCategory = categories.find((c) => c.id === sourceCategoryId);
      const targetCategory = categories.find((c) => c.id === targetCategoryId);
      if (!sourceCategory || !targetCategory) return false;

      const taskIndex = sourceCategory.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return false;

      const taskToMove = { ...sourceCategory.tasks[taskIndex], category_id: targetCategoryId };

      const newSourceTasks = [...sourceCategory.tasks];
      newSourceTasks.splice(taskIndex, 1);

      const newTargetTasks = [...targetCategory.tasks];
      newTargetTasks.splice(newIndex, 0, taskToMove);

      const sourceUpdates = newSourceTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx,
      }));

      const targetUpdates = newTargetTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx,
      }));

      await Promise.all([
        supabase
          .from('tasks')
          .update({ category_id: targetCategoryId, order_index: newIndex })
          .eq('id', taskId),

        ...sourceUpdates.map((update) =>
          supabase
            .from('tasks')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        ),

        ...targetUpdates
          .filter(t => t.id !== taskId)
          .map((update) =>
            supabase
              .from('tasks')
              .update({ order_index: update.order_index })
              .eq('id', update.id)
          )
      ]);

      return true;
    } catch (err) {
      console.error('Move task failed', err);
      fetchCategories();
      return false;
    }
  };

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    reorderTask,
    moveTask,
    refreshCategories: () => fetchCategories(),
  };
}
