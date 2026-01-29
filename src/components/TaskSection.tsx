'use client';

import { useState } from 'react';
import {
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  ListTodo,
  CheckCircle2,
  Circle,
  GripVertical,
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
  onReorderCategory: (categoryId: string, newOrderIndex: number) => Promise<boolean>;
  onReorderTask: (categoryId: string, taskId: string, newOrderIndex: number) => Promise<boolean>;
  isReadOnly?: boolean;
}

// Helper to get alternating gradients for cards
const getCategoryGradient = (index: number) => {
  // Consistent Monochrome Hover with Strong "Glow" (Deep Shadow)
  return 'bg-white border-gray-200/60 shadow-sm hover:border-slate-900 hover:shadow-[0_0_25px_rgba(0,0,0,0.15)] hover:-translate-y-0.5';
};

export default function TaskSection({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onReorderCategory,
  onReorderTask,
  isReadOnly = false,
}: TaskSectionProps) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // No longer tracking expanded state - always open

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [creatingTaskInCategory, setCreatingTaskInCategory] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');

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
    <div className="glass-panel prominent-shadow rounded-3xl h-full flex flex-col relative overflow-hidden">
      {/* Soft overlay gradient - Monochrome */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50/50 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Styled Header */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between backdrop-blur-sm">
        <div className="flex-1 flex items-center gap-6 mr-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-2xl ring-1 ring-white/10">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Tasks</h2>
              <p className="text-xs text-slate-400 font-medium">{categories.length} categories</p>
            </div>
          </div>

          {/* Global Progress Bar */}
          {categories.length > 0 && (() => {
            const totalTasks = categories.reduce((acc, cat) => acc + cat.tasks.length, 0);
            const completedTasks = categories.reduce((acc, cat) => acc + cat.tasks.filter(t => t.completed).length, 0);
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return (
              <div className="flex-1 max-w-lg ml-6 flex items-center gap-4">
                <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-emerald-400 min-w-[3ch]">{progress}%</span>
              </div>
            );
          })()}
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setIsCreatingCategory(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-semibold text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pr-2">
        {/* New Category Input */}
        {isCreatingCategory && !isReadOnly && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-gray-50 rounded-2xl border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New Category Name..."
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-500/20 focus:border-slate-900 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') setIsCreatingCategory(false);
              }}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateCategory}
                className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm"
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

        {/* Categories Grid */}
        {categories.length === 0 && !isCreatingCategory ? (
          <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
            <ListTodo className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No active tasks</p>
            <p className="text-sm text-gray-400 mt-1">Add a category to get started</p>
          </div>
        ) : (
          <div className="columns-1 xl:columns-2 gap-4 pb-4 space-y-4">
            {categories.map((category, index) => {
              const completedCount = category.tasks.filter(t => t.completed).length;
              const totalCount = category.tasks.length;
              const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

              return (
                <div
                  key={category.id}
                  className={`break-inside-avoid rounded-2xl border transition-all duration-200 flex flex-col h-fit bg-white/40 backdrop-blur-sm ${getCategoryGradient(index)}`}
                  draggable={!isReadOnly}

                  onDragStart={(e) => {
                    // We will implement the ref check logic using a module-level variable or a ref if possible
                    // safely assuming single-threaded JS UI
                    if ((window as any).__isDragHandleDown !== true) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData('categoryId', category.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    // Reset
                    (window as any).__isDragHandleDown = false;

                    const draggedId = e.dataTransfer.getData('categoryId');
                    if (draggedId && draggedId !== category.id) {
                      const draggedIndex = categories.findIndex(c => c.id === draggedId);
                      const targetIndex = index;
                      if (draggedIndex !== targetIndex) {
                        onReorderCategory(draggedId, targetIndex);
                      }
                    }
                  }}
                >
                  {/* Category Header */}
                  <div className="p-4 flex items-start justify-between gap-3">
                    {!isReadOnly && (
                      <div
                        className="drag-handle mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                        onMouseDown={() => { (window as any).__isDragHandleDown = true; }}
                        onMouseUp={() => { (window as any).__isDragHandleDown = false; }}
                        onMouseLeave={() => { (window as any).__isDragHandleDown = false; }}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    {editingCategoryId === category.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white/50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateCategory(category.id);
                            if (e.key === 'Escape') setEditingCategoryId(null);
                          }}
                          onBlur={() => handleUpdateCategory(category.id)}
                        />
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleUpdateCategory(category.id)}
                          className="text-green-600 hover:text-green-700 p-1"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setEditingCategoryId(null)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex-1"
                        onDoubleClick={() => !isReadOnly && startEditingCategory(category)}
                      >
                        <h3 className="font-bold text-gray-900 text-lg tracking-tight leading-none mb-1">
                          {category.name}
                        </h3>
                        <div className="text-xs font-medium text-gray-500">
                          {completedCount} of {totalCount} completed
                        </div>
                      </div>
                    )}

                    {/* Edit controls for category */}
                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditingCategory(category)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
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
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="px-4 mb-3">
                    <div className="h-1.5 w-full bg-gray-200/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] font-bold text-gray-400">{progress}%</span>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="px-2 pb-2 space-y-1">
                    {category.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group/task relative flex items-center gap-3 px-3 py-2 bg-white/60 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 ${editingTaskId !== task.id && !isReadOnly ? 'cursor-move' : ''}`}
                        draggable={editingTaskId !== task.id && !isReadOnly}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('taskId', task.id);
                          e.dataTransfer.setData('sourceCategoryId', category.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const draggedTaskId = e.dataTransfer.getData('taskId');
                          const sourceCategoryId = e.dataTransfer.getData('sourceCategoryId');

                          if (draggedTaskId && sourceCategoryId === category.id && draggedTaskId !== task.id) {
                            const draggedIndex = category.tasks.findIndex(t => t.id === draggedTaskId);
                            // We need the TARGET index. Since we are mapping, we know 'task' is the target.
                            const targetIndex = category.tasks.findIndex(t => t.id === task.id);

                            if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
                              onReorderTask(category.id, draggedTaskId, targetIndex);
                            }
                          }
                        }}
                        onDoubleClick={() => !isReadOnly && startEditingTask(task)}
                      >
                        <button
                          onClick={() => !isReadOnly && onToggleTask(category.id, task.id, !task.completed)}
                          disabled={isReadOnly}
                          className={`flex-shrink-0 transition-all duration-300 ${task.completed ? 'text-emerald-500 scale-105' : 'text-gray-300 hover:text-emerald-400'} ${isReadOnly ? 'cursor-default' : ''}`}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 fill-emerald-50" />
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
                              onBlur={() => handleUpdateTask(category.id, task.id)}
                            />
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleUpdateTask(category.id, task.id)}
                              className="text-green-600 hover:text-green-700 p-1"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setEditingTaskId(null)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`flex-1 text-sm font-medium transition-all duration-200 ${task.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700'
                                }`}
                            >
                              {task.name}
                            </span>

                            <div className={`flex items-center transition-all gap-1 ${isReadOnly ? 'hidden' : 'opacity-0 group-hover/task:opacity-100'}`}>
                              <button
                                onClick={() => startEditingTask(task)}
                                className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onDeleteTask(category.id, task.id)}
                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add Task Button (Small) */}
                    {!creatingTaskInCategory && !isReadOnly && (
                      <button
                        onClick={() => setCreatingTaskInCategory(category.id)}
                        className="w-full py-2 flex items-center justify-center gap-1 text-xs font-semibold text-gray-400 hover:text-slate-900 hover:bg-white/50 rounded-xl transition-colors mt-2"
                      >
                        <Plus className="w-3 h-3" />
                        Add Task
                      </button>
                    )}

                    {/* New Task Input (Inline) */}
                    {creatingTaskInCategory === category.id && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-1 duration-200">
                        <input
                          type="text"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          placeholder="Task name..."
                          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-indigo-300/70 font-medium"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateTask(category.id);
                            if (e.key === 'Escape') setCreatingTaskInCategory(null);
                          }}
                        />
                        <button onClick={() => handleCreateTask(category.id)} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded-md"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCreatingTaskInCategory(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}

                    {category.tasks.length === 0 && !creatingTaskInCategory && (
                      <div className="text-center pb-2">
                        <span className="text-xs text-gray-400/80 italic">No tasks yet</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
