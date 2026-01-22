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
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <ListTodo className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Project Tasks</h2>
        </div>

        <button
          onClick={() => setIsCreatingCategory(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {/* New Category Input */}
        {isCreatingCategory && (
          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New Category Name..."
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') setIsCreatingCategory(false);
              }}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateCategory}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsCreatingCategory(false);
                  setNewCategoryName('');
                }}
                className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.length === 0 && !isCreatingCategory ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
            <ListTodo className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tasks yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a category to get started</p>
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="group/category"
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 py-2 group-hover/category:translate-x-1 transition-transform duration-200">
                <button
                  onClick={() => toggleCategoryExpand(category.id)}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>

                {editingCategoryId === category.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateCategory(category.id);
                        if (e.key === 'Escape') setEditingCategoryId(null);
                      }}
                    />
                    <button onClick={() => handleUpdateCategory(category.id)} className="text-green-600 hover:text-green-700 p-1"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingCategoryId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <h3 className="flex-1 font-bold text-gray-800 text-lg tracking-tight">
                      {category.name}
                    </h3>

                    <div className="flex items-center opacity-0 group-hover/category:opacity-100 transition-all gap-1 mr-2">
                      <button
                        onClick={() => setCreatingTaskInCategory(category.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Task
                      </button>
                      <button
                        onClick={() => startEditingCategory(category)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(category.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 min-w-[3rem] text-center">
                      {category.tasks.filter((t) => t.completed).length}/{category.tasks.length}
                    </span>
                  </>
                )}
              </div>

              {/* Tasks List */}
              {expandedCategories.has(category.id) && (
                <div className="pl-8 pr-2 mt-1 space-y-1 relative before:absolute before:left-[19px] before:top-0 before:bottom-4 before:w-px before:bg-gray-200/50">

                  {/* Task Items */}
                  {category.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="group/task relative flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50/80 transition-all duration-200"
                    >
                      <button
                        onClick={() => onToggleTask(category.id, task.id, !task.completed)}
                        className={`flex-shrink-0 transition-all duration-300 ${task.completed ? 'text-green-500 scale-105' : 'text-gray-300 hover:text-indigo-400'}`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 fill-green-50" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      {editingTaskId === task.id ? (
                        <div className="flex-1 flex items-center gap-2 z-10">
                          <input
                            type="text"
                            value={editingTaskName}
                            onChange={(e) => setEditingTaskName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateTask(category.id, task.id);
                              if (e.key === 'Escape') setEditingTaskId(null);
                            }}
                          />
                          <button onClick={() => handleUpdateTask(category.id, task.id)} className="text-green-600 hover:text-green-700 p-1"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingTaskId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`flex-1 text-[15px] font-medium transition-all duration-200 ${task.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700'
                              }`}
                          >
                            {task.name}
                          </span>

                          <div className="flex items-center opacity-0 group-hover/task:opacity-100 transition-all scale-95 group-hover/task:scale-100">
                            <button
                              onClick={() => startEditingTask(task)}
                              className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTask(category.id, task.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* New Task Input in List */}
                  {creatingTaskInCategory === category.id && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-1 duration-200 ml-0">
                      <Circle className="w-5 h-5 text-indigo-300" />
                      <input
                        type="text"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="What needs to be done?"
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-indigo-300/70 font-medium"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateTask(category.id);
                          if (e.key === 'Escape') setCreatingTaskInCategory(null);
                        }}
                      />
                      <button onClick={() => handleCreateTask(category.id)} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded-md"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setCreatingTaskInCategory(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md"><X className="w-4 h-4" /></button>
                    </div>
                  )}

                  {!creatingTaskInCategory && category.tasks.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400 italic">No tasks yet</div>
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
