import { Task } from '@/types/database';

export interface CategoryLike {
  id: string;
  name: string;
  order_index: number;
  tasks: Task[];
}

export type PhaseStatus = 'done' | 'active' | 'upcoming';

export interface Phase {
  id: string;
  name: string;
  total: number;
  done: number;
  status: PhaseStatus;
  completedAt: string | null; // when the last task in a finished phase was ticked
  tasks: Task[];
}

export interface ProjectSummary {
  total: number;
  done: number;
  percent: number;
  onboardingTasks: Task[];
  onboardingDone: number;
  hasOnboarding: boolean;
  onboardingComplete: boolean;
  clientPending: Task[]; // waiting on the client
  teamPending: Task[]; // waiting on ASR
  phases: Phase[];
  recentlyCompleted: (Task & { phaseName: string })[];
}

export const isClientTask = (t: Task) => t.owner === 'client';
export const isOnboardingTask = (t: Task) => isClientTask(t) && Boolean(t.is_onboarding);

const latest = (dates: (string | null | undefined)[]) =>
  dates.filter(Boolean).sort().pop() ?? null;

export function summarizeProject(categories: CategoryLike[]): ProjectSummary {
  const ordered = [...categories].sort((a, b) => a.order_index - b.order_index);
  const all = ordered.flatMap((c) => c.tasks);
  const done = all.filter((t) => t.completed).length;
  const onboardingTasks = all.filter(isOnboardingTask);
  const onboardingDone = onboardingTasks.filter((t) => t.completed).length;

  let activeAssigned = false;
  const phases: Phase[] = ordered
    .filter((c) => c.tasks.length > 0)
    .map((c) => {
      const phaseDone = c.tasks.filter((t) => t.completed).length;
      let status: PhaseStatus = 'upcoming';
      if (phaseDone === c.tasks.length) {
        status = 'done';
      } else if (phaseDone > 0 || !activeAssigned) {
        // Work has started here, or it is simply the next phase in line.
        status = 'active';
        activeAssigned = true;
      }
      return {
        id: c.id,
        name: c.name,
        total: c.tasks.length,
        done: phaseDone,
        status,
        completedAt: status === 'done' ? latest(c.tasks.map((t) => t.completed_at)) : null,
        tasks: c.tasks,
      };
    });

  const recentlyCompleted = ordered
    .flatMap((c) => c.tasks.map((t) => ({ ...t, phaseName: c.name })))
    .filter((t) => t.completed && t.completed_at)
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))
    .slice(0, 6);

  return {
    total: all.length,
    done,
    percent: all.length === 0 ? 0 : Math.round((done / all.length) * 100),
    onboardingTasks,
    onboardingDone,
    hasOnboarding: onboardingTasks.length > 0,
    onboardingComplete: onboardingTasks.length > 0 && onboardingDone === onboardingTasks.length,
    clientPending: all.filter((t) => !t.completed && isClientTask(t)),
    teamPending: all.filter((t) => !t.completed && !isClientTask(t)),
    phases,
    recentlyCompleted,
  };
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
