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

  const fetchCategories = useCallback(async () => {
    if (!clientId) {
      setCategories([]);
      return;
    }

    try {
      setLoading(true);
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('client_id', clientId)
        .order('order_index');

      if (catError) throw catError;

      // Fetch tasks for all categories
      const categoriesWithTasks: CategoryWithTasks[] = [];
      for (const category of (categoriesData as Category[]) || []) {
        const { data: tasks, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('category_id', category.id)
          .order('order_index');

        if (taskError) throw taskError;

        categoriesWithTasks.push({
          ...category,
          tasks: (tasks as Task[]) || [],
        });
      }

      setCategories(categoriesWithTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      return false;
    }
  };

  const reorderCategory = async (categoryId: string, newOrderIndex: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ order_index: newOrderIndex })
        .eq('id', categoryId);

      if (error) throw error;

      setCategories((prev) => {
        const updated = prev.map(cat =>
          cat.id === categoryId ? { ...cat, order_index: newOrderIndex } : cat
        );
        return updated.sort((a, b) => a.order_index - b.order_index);
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder category');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      return false;
    }
  };

  const toggleTask = async (
    categoryId: string,
    taskId: string,
    completed: boolean
  ): Promise<boolean> => {
    return updateTask(categoryId, taskId, { completed });
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
    refreshCategories: fetchCategories,
  };
}
