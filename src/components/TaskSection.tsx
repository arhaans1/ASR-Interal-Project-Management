'use client';

import { useState } from 'react';
import {
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
} from 'lucide-react';
import { CategoryWithTasks } from '@/hooks/useCategories';
import { Task } from '@/types/database';

interface TaskSectionProps {
  categories: CategoryWithTasks[];
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (categoryId: string, name: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onCreateTask: (categoryId: string, name: string) => Promise<void>;
  onUpdateTask: (categoryId: string, taskId: string, name: string) => Promise<void>;
  onDeleteTask: (categoryId: string, taskId: string) => Promise<void>;
  onToggleTask: (categoryId: string, taskId: string, completed: boolean) => Promise<void>;
}

export default function TaskSection({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
}: TaskSectionProps) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [creatingTaskInCategory, setCreatingTaskInCategory] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCreateCategory = async () => {
    if (newCategoryName.trim()) {
      await onCreateCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsCreatingCategory(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (editingCategoryName.trim()) {
      await onUpdateCategory(categoryId, editingCategoryName.trim());
      setEditingCategoryId(null);
      setEditingCategoryName('');
    }
  };

  const handleCreateTask = async (categoryId: string) => {
    if (newTaskName.trim()) {
      await onCreateTask(categoryId, newTaskName.trim());
      setNewTaskName('');
      setCreatingTaskInCategory(null);
    }
  };

  const handleUpdateTask = async (categoryId: string, taskId: string) => {
    if (editingTaskName.trim()) {
      await onUpdateTask(categoryId, taskId, editingTaskName.trim());
      setEditingTaskId(null);
      setEditingTaskName('');
    }
  };

  const startEditingCategory = (category: CategoryWithTasks) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>
        <button
          onClick={() => setIsCreatingCategory(true)}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Category
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {/* New Category Input */}
        {isCreatingCategory && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') setIsCreatingCategory(false);
              }}
            />
            <button
              onClick={handleCreateCategory}
              className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsCreatingCategory(false);
                setNewCategoryName('');
              }}
              className="p-1.5 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Categories */}
        {categories.length === 0 && !isCreatingCategory ? (
          <p className="text-center text-gray-400 py-8">
            No categories yet. Click "Create Category" to add one.
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Category Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <button
                  onClick={() => toggleCategoryExpand(category.id)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {editingCategoryId === category.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCategory(category.id);
                        if (e.key === 'Escape') setEditingCategoryId(null);
                      }}
                    />
                    <button
                      onClick={() => handleUpdateCategory(category.id)}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditingCategoryId(null)}
                      className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-medium text-gray-700">
                      {category.name}
                    </span>
                    <span className="text-xs text-gray-400 mr-2">
                      {category.tasks.filter((t) => t.completed).length}/
                      {category.tasks.length}
                    </span>
                    <button
                      onClick={() => setCreatingTaskInCategory(category.id)}
                      className="p-1 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Add task"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEditingCategory(category)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Edit category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(category.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Tasks */}
              {expandedCategories.has(category.id) && (
                <div className="p-2 space-y-1">
                  {/* New Task Input */}
                  {creatingTaskInCategory === category.id && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Circle className="w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="Task name..."
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateTask(category.id);
                          if (e.key === 'Escape') setCreatingTaskInCategory(null);
                        }}
                      />
                      <button
                        onClick={() => handleCreateTask(category.id)}
                        className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setCreatingTaskInCategory(null);
                          setNewTaskName('');
                        }}
                        className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Task List */}
                  {category.tasks.length === 0 && creatingTaskInCategory !== category.id ? (
                    <p className="text-center text-gray-400 text-sm py-3">
                      No tasks. Click + to add one.
                    </p>
                  ) : (
                    category.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          task.completed ? 'bg-green-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          onClick={() =>
                            onToggleTask(category.id, task.id, !task.completed)
                          }
                          className="flex-shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-400 transition-colors" />
                          )}
                        </button>

                        {editingTaskId === task.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTaskName}
                              onChange={(e) => setEditingTaskName(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleUpdateTask(category.id, task.id);
                                if (e.key === 'Escape') setEditingTaskId(null);
                              }}
                            />
                            <button
                              onClick={() => handleUpdateTask(category.id, task.id)}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`flex-1 text-sm ${
                                task.completed
                                  ? 'line-through text-gray-400'
                                  : 'text-gray-700'
                              }`}
                            >
                              {task.name}
                            </span>
                            <button
                              onClick={() => startEditingTask(task)}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTask(category.id, task.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
