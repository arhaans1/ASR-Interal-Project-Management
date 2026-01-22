'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  Circle,
  CheckCircle2,
  ListTodo,
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

const cardColors = [
  { bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', border: 'border-emerald-100', progress: 'bg-emerald-400' },
  { bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-100', progress: 'bg-amber-400' },
  { bg: 'bg-gradient-to-br from-pink-50 to-rose-50', border: 'border-pink-100', progress: 'bg-pink-400' },
  { bg: 'bg-gradient-to-br from-indigo-50 to-violet-50', border: 'border-indigo-100', progress: 'bg-indigo-400' },
  { bg: 'bg-gradient-to-br from-cyan-50 to-sky-50', border: 'border-cyan-100', progress: 'bg-cyan-400' },
  { bg: 'bg-gradient-to-br from-yellow-50 to-lime-50', border: 'border-yellow-100', progress: 'bg-yellow-400' },
];

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [creatingTaskInCategory, setCreatingTaskInCategory] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');

  // Auto-expand all categories
  useEffect(() => {
    setExpandedCategories(new Set(categories.map((c) => c.id)));
  }, [categories]);

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

  const getProgress = (category: CategoryWithTasks) => {
    if (category.tasks.length === 0) return 0;
    return Math.round((category.tasks.filter((t) => t.completed).length / category.tasks.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Tasks</h2>
            <p className="text-sm text-slate-400">{categories.length} categories</p>
          </div>
        </div>
        <button
          onClick={() => setIsCreatingCategory(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all font-semibold shadow-sm border border-indigo-100"
        >
          <Plus className="w-5 h-5" />
          New Category
        </button>
      </div>

      {/* New Category Input */}
      {isCreatingCategory && (
        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-100 border border-slate-100">
          <p className="text-sm font-semibold text-slate-600 mb-3">Create New Category</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name..."
              className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 transition-all outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') setIsCreatingCategory(false);
              }}
            />
            <button
              onClick={handleCreateCategory}
              className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsCreatingCategory(false);
                setNewCategoryName('');
              }}
              className="p-3 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {categories.length === 0 && !isCreatingCategory ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ListTodo className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">No categories yet</p>
          <p className="text-slate-400 text-sm mt-1">Click "New Category" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {categories.map((category, index) => {
            const colors = cardColors[index % cardColors.length];
            const progress = getProgress(category);

            return (
              <div
                key={category.id}
                className={`${colors.bg} rounded-3xl p-6 border ${colors.border} transition-all hover:shadow-lg`}
              >
                {/* Category Header */}
                <div className="flex items-start justify-between mb-4">
                  {editingCategoryId === category.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white rounded-lg text-sm border-2 border-indigo-300 focus:border-indigo-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateCategory(category.id);
                          if (e.key === 'Escape') setEditingCategoryId(null);
                        }}
                      />
                      <button
                        onClick={() => handleUpdateCategory(category.id)}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        className="p-2 bg-slate-400 text-white rounded-lg hover:bg-slate-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{category.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {category.tasks.filter((t) => t.completed).length} of {category.tasks.length} completed
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditingCategory(category)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteCategory(category.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-white/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Progress</span>
                    <span className="text-xs font-bold text-slate-700">{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.progress} rounded-full transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  {creatingTaskInCategory === category.id && (
                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl">
                      <Circle className="w-5 h-5 text-slate-300" />
                      <input
                        type="text"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="Task name..."
                        className="flex-1 px-2 py-1 text-sm outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateTask(category.id);
                          if (e.key === 'Escape') setCreatingTaskInCategory(null);
                        }}
                      />
                      <button
                        onClick={() => handleCreateTask(category.id)}
                        className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setCreatingTaskInCategory(null);
                          setNewTaskName('');
                        }}
                        className="p-1.5 bg-slate-300 text-slate-600 rounded-lg hover:bg-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {category.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                        task.completed ? 'bg-white/40' : 'bg-white hover:shadow-md'
                      }`}
                    >
                      <button
                        onClick={() => onToggleTask(category.id, task.id, !task.completed)}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500 transition-colors" />
                        )}
                      </button>

                      {editingTaskId === task.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTaskName}
                            onChange={(e) => setEditingTaskName(e.target.value)}
                            className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateTask(category.id, task.id);
                              if (e.key === 'Escape') setEditingTaskId(null);
                            }}
                          />
                          <button
                            onClick={() => handleUpdateTask(category.id, task.id)}
                            className="p-1 bg-emerald-500 text-white rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingTaskId(null)}
                            className="p-1 bg-slate-400 text-white rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`flex-1 text-sm ${
                              task.completed ? 'line-through text-slate-400' : 'text-slate-700'
                            }`}
                          >
                            {task.name}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={() => startEditingTask(task)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTask(category.id, task.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {category.tasks.length === 0 && creatingTaskInCategory !== category.id && (
                    <p className="text-sm text-slate-400 text-center py-4">No tasks yet</p>
                  )}
                </div>

                {/* Add Task Button */}
                <button
                  onClick={() => setCreatingTaskInCategory(category.id)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 text-sm font-medium text-slate-500 hover:text-indigo-600 bg-white/50 hover:bg-white rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
