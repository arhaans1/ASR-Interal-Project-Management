'use client';

import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Edit2,
  GripVertical,
  ListTodo,
  Lock,
  Plus,
  Trash2,
  User as UserIcon,
  UserCheck,
  X,
} from 'lucide-react';
import { CategoryWithTasks } from '@/hooks/useCategories';
import { Task } from '@/types/database';
import { formatDate, isClientTask, Phase, summarizeProject } from '@/lib/progress';
import TaskAssignModal from './TaskAssignModal';

interface TaskSectionProps {
  categories: CategoryWithTasks[];
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (categoryId: string, name: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onCreateTask: (categoryId: string, name: string) => Promise<void>;
  onUpdateTask: (categoryId: string, taskId: string, updates: any) => Promise<void>;
  onDeleteTask: (categoryId: string, taskId: string) => Promise<void>;
  onToggleTask: (categoryId: string, taskId: string, completed: boolean) => Promise<void>;
  onReorderCategory: (categoryId: string, newOrderIndex: number) => Promise<boolean>;
  onReorderTask: (categoryId: string, taskId: string, newOrderIndex: number) => Promise<boolean>;
  onMoveTask: (sourceCategoryId: string, targetCategoryId: string, taskId: string, newOrderIndex: number) => Promise<boolean>;
  isReadOnly?: boolean;
  // Project cards run one phase at a time: phases after the one in hand stay locked.
  sequential?: boolean;
}

// Whose tasks are on show
type OwnerFilter = 'all' | 'team' | 'client';

const avatarColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

// The board: one column, in the order the project runs. The phase being worked on is open
// at the top, later phases wait closed beneath it, and finished phases turn green and drop
// into "Completed" at the bottom.
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
  onMoveTask,
  isReadOnly = false,
  sequential = false,
}: TaskSectionProps) {
  const summary = useMemo(() => summarizeProject(categories), [categories]);
  const phaseById = useMemo(() => {
    const map: Record<string, Phase> = {};
    summary.phases.forEach((phase) => { map[phase.id] = phase; });
    return map;
  }, [summary]);

  const [filter, setFilter] = useState<OwnerFilter>('all');
  // Rows the person opened or closed by hand. Everything else follows the project.
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [creatingTaskInCategory, setCreatingTaskInCategory] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');

  // Assigning a task to a team member
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  // Assignments made just now, shown before the next refresh brings them in
  const [localAssignees, setLocalAssignees] = useState<Record<string, string>>({});

  const [toastMessage, setToastMessage] = useState('');

  // ---- What goes where -----------------------------------------------------

  const matchesFilter = (task: Task) =>
    filter === 'all' || (filter === 'client' ? isClientTask(task) : !isClientTask(task));

  // Finished, as far as the tasks on show go: under "Client", a phase is done once the
  // client's part of it is.
  const isDone = (category: CategoryWithTasks) => {
    const tasks = category.tasks.filter(matchesFilter);
    return tasks.length > 0 && tasks.every((t) => t.completed);
  };

  const numbered = categories.map((category, index) => ({ category, number: index + 1 }));
  const shown = numbered.filter(({ category }) => filter === 'all' || category.tasks.some(matchesFilter));
  const openRows = shown.filter(({ category }) => !isDone(category));
  const doneRows = shown.filter(({ category }) => isDone(category));

  // The phase in hand: the first one that is not finished
  const focusId = openRows[0]?.category.id ?? null;
  // On a project card, every unfinished phase after the one in hand is locked until its turn.
  const isLocked = (category: CategoryWithTasks) =>
    sequential && category.id !== focusId && !isDone(category);
  const isOpen = (category: CategoryWithTasks) =>
    !isLocked(category) && (openOverride[category.id] ?? category.id === focusId);
  const toggleOpen = (category: CategoryWithTasks) => {
    if (isLocked(category)) return;
    setOpenOverride((prev) => ({ ...prev, [category.id]: !isOpen(category) }));
  };

  const teamPending = summary.teamPending.length;
  const clientPending = categories.flatMap((c) => c.tasks).filter((t) => isClientTask(t) && !t.completed).length;
  const hasClientTasks = categories.some((c) => c.tasks.some(isClientTask));
  const canRearrange = !isReadOnly && filter === 'all';

  // ---- Actions -------------------------------------------------------------

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAssign = async (boardId: string, memberName: string) => {
    if (!assigningTask) return;
    try {
      // The server marks the task and puts a copy on that person's board.
      const res = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: assigningTask.id, boardId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to assign task');

      setLocalAssignees((prev) => ({ ...prev, [assigningTask.id]: memberName }));
      setAssignModalOpen(false);
      showToast(`Task assigned to ${memberName}`);
    } catch (e) {
      console.error('Assignment failed', e);
      alert('Failed to assign task');
    }
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
    }
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleCreateTask = async (categoryId: string) => {
    if (newTaskName.trim()) {
      await onCreateTask(categoryId, newTaskName.trim());
      setNewTaskName('');
      // Stay in "add" mode so several tasks can be typed one after another
    } else {
      setCreatingTaskInCategory(null);
    }
  };

  const handleUpdateTask = async (categoryId: string, taskId: string) => {
    if (editingTaskName.trim()) {
      await onUpdateTask(categoryId, taskId, { name: editingTaskName.trim() });
    }
    setEditingTaskId(null);
    setEditingTaskName('');
  };

  // Who does a task: the team (default), the client as an onboarding step, or the client.
  const cycleOwner = (categoryId: string, task: Task) => {
    const next =
      task.owner !== 'client'
        ? { owner: 'client', is_onboarding: true }
        : task.is_onboarding
          ? { owner: 'client', is_onboarding: false }
          : { owner: 'team', is_onboarding: false };
    onUpdateTask(categoryId, task.id, next);
  };

  const ownerTitle = (task: Task) =>
    task.owner !== 'client'
      ? 'Done by the team. Click to make this a client onboarding step.'
      : task.is_onboarding
        ? 'Client onboarding step. Click to make it a regular client task.'
        : 'Client task. Click to hand it back to the team.';

  // ---- Pieces --------------------------------------------------------------

  const renderTask = (category: CategoryWithTasks, task: Task) => {
    const assignee = localAssignees[task.id] ?? task.assigned_user_name ?? null;
    const editing = editingTaskId === task.id;

    return (
      <li
        key={task.id}
        className={`group/task flex items-start gap-3 rounded-xl border bg-white px-3 py-2.5 transition-colors ${task.completed ? 'border-slate-200/60' : 'border-slate-200 hover:border-slate-300'} ${!editing && canRearrange ? 'cursor-grab active:cursor-grabbing' : ''}`}
        draggable={!editing && canRearrange}
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
          if (!draggedTaskId || !canRearrange) return;

          const targetIndex = category.tasks.findIndex((t) => t.id === task.id);
          if (sourceCategoryId === category.id) {
            const draggedIndex = category.tasks.findIndex((t) => t.id === draggedTaskId);
            if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
              onReorderTask(category.id, draggedTaskId, targetIndex);
            }
          } else if (sourceCategoryId && targetIndex !== -1) {
            onMoveTask(sourceCategoryId, category.id, draggedTaskId, targetIndex);
          }
        }}
        onDoubleClick={() => {
          if (!isReadOnly && !editing) {
            setEditingTaskId(task.id);
            setEditingTaskName(task.name);
          }
        }}
      >
        <button
          type="button"
          onClick={() => !isReadOnly && onToggleTask(category.id, task.id, !task.completed)}
          disabled={isReadOnly}
          aria-label={task.completed ? `Mark "${task.name}" as not done` : `Mark "${task.name}" as done`}
          className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'} ${isReadOnly ? 'cursor-default' : ''}`}
        >
          {task.completed ? <CheckCircle2 className="h-5 w-5 fill-emerald-50" /> : <Circle className="h-5 w-5" />}
        </button>

        {editing ? (
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <textarea
              value={editingTaskName}
              onChange={(e) => setEditingTaskName(e.target.value)}
              className="min-h-[72px] w-full flex-1 resize-y rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleUpdateTask(category.id, task.id);
                }
                if (e.key === 'Escape') setEditingTaskId(null);
              }}
              onBlur={() => handleUpdateTask(category.id, task.id)}
            />
          </div>
        ) : (
          <>
            <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-medium leading-snug ${task.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
              {task.name.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-indigo-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {part}
                  </a>
                ) : (
                  part
                )
              )}
            </span>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {task.owner === 'client' && (
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${task.is_onboarding
                    ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                    : task.is_approval
                      ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                      : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                    }`}
                  title="The client ticks this in their portal. You can tick it for them."
                >
                  {task.is_onboarding ? 'Client · Onboarding' : task.is_approval ? 'Client · Approval' : 'Client'}
                </span>
              )}

              {task.origin_client_name && (
                <span className="max-w-[160px] truncate rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 ring-1 ring-rose-200">
                  {task.origin_client_name}
                </span>
              )}

              {task.completed && task.completed_at && (
                <span className="text-xs text-slate-400">{formatDate(task.completed_at)}</span>
              )}

              {assignee && (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor(assignee)}`}
                  title={`Assigned to ${assignee}`}
                >
                  {assignee.slice(0, 1).toUpperCase()}
                </span>
              )}

              {/* Tools stay out of the way until the row is pointed at or focused */}
              {!isReadOnly && (
                <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/task:opacity-100">
                  <button
                    type="button"
                    onClick={() => cycleOwner(category.id, task)}
                    className={`rounded-lg p-1 transition-colors hover:bg-violet-50 ${task.owner === 'client' ? 'text-violet-600' : 'text-slate-400 hover:text-violet-600'}`}
                    title={ownerTitle(task)}
                    aria-label={ownerTitle(task)}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssigningTask(task); setAssignModalOpen(true); }}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                    title={assignee ? `Assigned to ${assignee}. Click to reassign.` : 'Assign to a team member'}
                    aria-label="Assign to a team member"
                  >
                    <UserIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingTaskId(task.id); setEditingTaskName(task.name); }}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Rename "${task.name}"`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(category.id, task.id)}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label={`Delete "${task.name}"`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </li>
    );
  };

  const renderRow = ({ category, number }: { category: CategoryWithTasks; number: number }) => {
    const done = isDone(category);
    const open = isOpen(category);
    const locked = isLocked(category);
    const phase = phaseById[category.id];
    const tasks = category.tasks.filter(matchesFilter);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    const inHand = category.id === focusId;
    const clientOpen = category.tasks.filter((t) => isClientTask(t) && !t.completed).length;

    return (
      <li
        key={category.id}
        className={`rounded-2xl border transition-colors ${done
          ? 'border-emerald-200 bg-emerald-50/50'
          : inHand
            ? 'border-slate-300 bg-white shadow-sm'
            : 'border-slate-200/80 bg-slate-50/60'
          }`}
        draggable={canRearrange}
        onDragStart={(e) => {
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
          (window as any).__isDragHandleDown = false;
          if (!canRearrange) return;

          const draggedId = e.dataTransfer.getData('categoryId');
          if (draggedId && draggedId !== category.id) {
            onReorderCategory(draggedId, categories.findIndex((c) => c.id === category.id));
          }

          const draggedTaskId = e.dataTransfer.getData('taskId');
          const sourceCategoryId = e.dataTransfer.getData('sourceCategoryId');
          if (draggedTaskId && sourceCategoryId && sourceCategoryId !== category.id && !locked) {
            onMoveTask(sourceCategoryId, category.id, draggedTaskId, category.tasks.length);
          }
        }}
      >
        {/* Row header */}
        <div className="group/row flex items-center gap-3 px-4 py-3">
          {canRearrange && (
            <div
              className="-ml-1 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
              title="Drag to reorder"
              onMouseDown={() => { (window as any).__isDragHandleDown = true; }}
              onMouseUp={() => { (window as any).__isDragHandleDown = false; }}
              onMouseLeave={() => { (window as any).__isDragHandleDown = false; }}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done
              ? 'bg-emerald-500 text-white'
              : phase?.status === 'awaiting'
                ? 'bg-amber-500 text-white'
                : inHand
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200'
              }`}
          >
            {done ? <Check className="h-4 w-4" strokeWidth={3} /> : number}
          </span>

          {editingCategoryId === category.id ? (
            <input
              type="text"
              value={editingCategoryName}
              onChange={(e) => setEditingCategoryName(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              aria-label="Category name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateCategory(category.id);
                if (e.key === 'Escape') setEditingCategoryId(null);
              }}
              onBlur={() => handleUpdateCategory(category.id)}
            />
          ) : (
            <button
              type="button"
              onClick={() => toggleOpen(category)}
              aria-expanded={open}
              aria-disabled={locked}
              title={locked ? 'Locked until the phase above is complete' : undefined}
              className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left ${locked ? 'cursor-not-allowed' : ''}`}
            >
              <span className={`text-base font-bold tracking-tight ${done ? 'text-emerald-900' : locked ? 'text-slate-500' : 'text-slate-900'}`}>
                {category.name}
              </span>
              <span className={`text-sm font-medium tabular-nums ${done ? 'text-emerald-700' : 'text-slate-500'}`}>
                {completed} of {total}
              </span>

              {phase?.status === 'awaiting' && (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Pending client approval
                </span>
              )}
              {!done && clientOpen > 0 && phase?.status !== 'awaiting' && (
                <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 ring-1 ring-sky-200">
                  Client · {clientOpen} open
                </span>
              )}
              {!done && phase && phase.status !== 'awaiting' && (phase.dueDate || phase.dueHint) && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${phase.overdue ? 'text-red-600' : 'text-slate-500'}`}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  {phase.dueKind === 'submit' ? 'Submit for approval ' : phase.overdue ? 'Was due ' : 'Due '}
                  {phase.dueDate ? (phase.dueKind === 'submit' ? `by ${formatDate(phase.dueDate)}` : formatDate(phase.dueDate)) : phase.dueHint}
                </span>
              )}
              {done && phase?.completedAt && (
                <span className="text-xs font-medium text-emerald-700">Completed {formatDate(phase.completedAt)}</span>
              )}
            </button>
          )}

          {!done && total > 0 && (
            <div className="hidden w-28 shrink-0 items-center gap-2 sm:flex" aria-hidden>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
              <span className="w-8 text-right text-xs font-bold tabular-nums text-slate-500">{percent}%</span>
            </div>
          )}

          {!isReadOnly && editingCategoryId !== category.id && (
            <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
              <button
                type="button"
                onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                aria-label={`Rename ${category.name}`}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const count = category.tasks.length;
                  if (count === 0 || confirm(`Delete "${category.name}" and its ${count} task${count === 1 ? '' : 's'}?`)) {
                    onDeleteCategory(category.id);
                  }
                }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {locked ? (
            <span className="shrink-0 p-1 text-slate-400" title="Locked until the phase above is complete">
              <Lock className="h-4 w-4" aria-label="Locked" />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => toggleOpen(category)}
              aria-label={open ? `Close ${category.name}` : `Open ${category.name}`}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Tasks */}
        {open && (
          <div className="px-4 pb-4">
            <ul className="space-y-1.5">{tasks.map((task) => renderTask(category, task))}</ul>

            {tasks.length === 0 && creatingTaskInCategory !== category.id && (
              <p className="py-2 text-center text-xs italic text-slate-400">No tasks yet</p>
            )}

            {!isReadOnly && (
              creatingTaskInCategory === category.id ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2">
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Task name, then Enter"
                    aria-label="New task name"
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateTask(category.id);
                      if (e.key === 'Escape') { setCreatingTaskInCategory(null); setNewTaskName(''); }
                    }}
                  />
                  <button type="button" onClick={() => handleCreateTask(category.id)} aria-label="Add task" className="rounded-md p-1 text-indigo-600 hover:bg-indigo-50"><Check className="h-4 w-4" /></button>
                  <button type="button" onClick={() => { setCreatingTaskInCategory(null); setNewTaskName(''); }} aria-label="Cancel" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setCreatingTaskInCategory(category.id); setNewTaskName(''); }}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-white hover:text-slate-900"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </button>
              )
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="glass-panel prominent-shadow rounded-2xl h-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-200/80 px-6 py-4">
        <div className="mr-auto flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 p-2 text-white">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900">Tasks</h2>
            <p className="text-xs font-medium text-slate-500">
              {summary.done} of {summary.total} done
              {summary.total > 0 && <span className="font-bold text-slate-900"> · {summary.percent}%</span>}
            </p>
          </div>
        </div>

        {/* Overall progress runs along the bottom edge of the header */}
        {summary.total > 0 && (
          <div className="absolute inset-x-0 -bottom-px h-[3px] bg-slate-100" role="progressbar" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Overall progress">
            <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${summary.percent}%` }} />
          </div>
        )}

        {/* Whose tasks: everything, ours, or the client's */}
        {hasClientTasks && (
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Show tasks for">
            {([
              { id: 'all', label: 'All' },
              { id: 'team', label: 'ASR', count: teamPending },
              { id: 'client', label: 'Client', count: clientPending },
            ] as { id: OwnerFilter; label: string; count?: number }[]).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                title={option.count !== undefined ? `${option.count} pending` : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${filter === option.id
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                {option.label}
                {option.count !== undefined && (
                  <span className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${option.count > 0
                    ? option.id === 'client' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-200 text-slate-500'
                    }`}>
                    {option.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setIsCreatingCategory(true)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New Category
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isCreatingCategory && !isReadOnly && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              aria-label="New category name"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') setIsCreatingCategory(false);
              }}
            />
            <button type="button" onClick={handleCreateCategory} aria-label="Create category" className="rounded-lg bg-slate-900 p-2 text-white shadow-sm transition-colors hover:bg-black">
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setIsCreatingCategory(false); setNewCategoryName(''); }}
              aria-label="Cancel"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {categories.length === 0 && !isCreatingCategory ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
            <ListTodo className="mx-auto mb-3 h-12 w-12 text-slate-200" />
            <p className="font-medium text-slate-500">No tasks yet</p>
            <p className="mt-1 text-sm text-slate-400">Add a category to get started</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-500">
            {filter === 'client' ? 'No client tasks on this card.' : 'No ASR tasks on this card.'}
          </div>
        ) : (
          <>
            {openRows.length > 0 ? (
              <ul className="space-y-2.5">{openRows.map(renderRow)}</ul>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {filter === 'all' ? 'Everything on this card is done.' : filter === 'client' ? 'Nothing is pending from the client.' : 'Nothing is pending on our end.'}
              </div>
            )}

            {doneRows.length > 0 && (
              <section className="mt-6" aria-label="Completed">
                <div className="mb-2.5 flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                    Completed · {doneRows.length}
                  </span>
                  <span className="h-px flex-1 bg-emerald-200" />
                </div>
                <ul className="space-y-2">{doneRows.map(renderRow)}</ul>
              </section>
            )}
          </>
        )}
      </div>

      <TaskAssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssign={handleAssign}
        currentAssigneeId={assigningTask?.assigned_to || null}
        taskId={assigningTask?.id || ''}
      />

      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 animate-in">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl">
            <div className="rounded-full bg-emerald-500/20 p-2">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
