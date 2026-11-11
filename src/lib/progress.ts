import { DueAnchor, Task } from '@/types/database';

export interface CategoryLike {
  id: string;
  name: string;
  order_index: number;
  due_after?: DueAnchor | null;
  due_days?: number | null;
  tasks: Task[];
}

// 'awaiting' = the work is with the client for approval
export type PhaseStatus = 'done' | 'active' | 'awaiting' | 'upcoming';

export interface Phase {
  id: string;
  name: string;
  total: number;
  done: number;
  status: PhaseStatus;
  completedAt: string | null; // when the last task in a finished phase was ticked
  dueDate: string | null; // known once the point it counts from has been reached
  dueHint: string | null; // shown until then, e.g. "3 business days after onboarding is complete"
  // 'submit' = the date our work goes to the client for approval; 'due' = the phase is finished
  dueKind: 'due' | 'submit';
  overdue: boolean;
  tasks: Task[];
}

export type StageKey = 'empty' | 'onboarding' | 'pending_approval' | 'in_progress' | 'complete';

export interface ProjectSummary {
  total: number;
  done: number;
  percent: number;
  onboardingTasks: Task[];
  onboardingDone: number;
  hasOnboarding: boolean;
  onboardingComplete: boolean;
  onboardingCompletedAt: string | null;
  approvalCompletedAt: string | null;
  clientPending: Task[]; // waiting on the client right now
  teamPending: Task[]; // waiting on ASR
  phases: Phase[];
  stage: { key: StageKey; label: string };
  hasTimeline: boolean; // at least one phase carries a due rule
  recentlyCompleted: (Task & { phaseName: string })[];
}

export const isClientTask = (t: Task) => t.owner === 'client';
export const isOnboardingTask = (t: Task) => isClientTask(t) && Boolean(t.is_onboarding);
export const isApprovalTask = (t: Task) => Boolean(t.is_approval);

const latest = (dates: (string | null | undefined)[]) =>
  (dates.filter(Boolean) as string[]).sort().pop() ?? null;

// ---------------------------------------------------------------------------
// Dates. Everything is worked out on the India calendar so the team, the client
// and the server all agree on which day something falls.
// ---------------------------------------------------------------------------

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Count forward in business days: Saturdays and Sundays are skipped.
// Finished on a Friday + 3 business days = the following Wednesday.
export function addBusinessDays(iso: string, days: number): string {
  // Shift so the UTC fields read as the India date.
  const date = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  date.setUTCHours(12, 0, 0, 0);

  let remaining = Math.max(0, Math.floor(days));
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  // Noon in India on the due day
  return new Date(date.getTime() - IST_OFFSET_MS).toISOString();
}

const indiaDay = (iso: string) => new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

const dueHintFor = (anchor: DueAnchor, days: number) => {
  const span = `${days} business day${days === 1 ? '' : 's'}`;
  return anchor === 'onboarding' ? `${span} after onboarding is complete` : `${span} after client approval`;
};

// ---------------------------------------------------------------------------

export function summarizeProject(categories: CategoryLike[], now: Date = new Date()): ProjectSummary {
  const ordered = [...categories].sort((a, b) => a.order_index - b.order_index);
  const all = ordered.flatMap((c) => c.tasks);
  const done = all.filter((t) => t.completed).length;

  const onboardingTasks = all.filter(isOnboardingTask);
  const onboardingDone = onboardingTasks.filter((t) => t.completed).length;
  const onboardingComplete = onboardingTasks.length > 0 && onboardingDone === onboardingTasks.length;
  const onboardingCompletedAt = onboardingComplete ? latest(onboardingTasks.map((t) => t.completed_at)) : null;

  const approvalTasks = all.filter(isApprovalTask);
  const approvalComplete = approvalTasks.length > 0 && approvalTasks.every((t) => t.completed);
  const approvalCompletedAt = approvalComplete ? latest(approvalTasks.map((t) => t.completed_at)) : null;

  // An approval can only be given once everything listed before it has been delivered.
  const readyApprovalIds = new Set<string>();
  let everythingBeforeDone = true;
  for (const category of ordered) {
    for (const task of category.tasks) {
      if (isApprovalTask(task) && !task.completed && everythingBeforeDone) readyApprovalIds.add(task.id);
      if (!task.completed) everythingBeforeDone = false;
    }
  }
  const isWaitingApproval = (t: Task) => isApprovalTask(t) && !t.completed;
  const isBlockedApproval = (t: Task) => isWaitingApproval(t) && !readyApprovalIds.has(t.id);

  const today = indiaDay(now.toISOString());
  let activeAssigned = false;
  let submitDays: number | null = null; // the onboarding window most recently seen
  const phases: Phase[] = ordered
    .filter((c) => c.tasks.length > 0)
    .map((c) => {
      const phaseDone = c.tasks.filter((t) => t.completed).length;
      const open = c.tasks.filter((t) => !t.completed);
      let status: PhaseStatus = 'upcoming';
      if (open.length === 0) {
        status = 'done';
      } else if (open.some((t) => readyApprovalIds.has(t.id))) {
        // Our work is in and the client's sign-off is what this phase is waiting for
        status = 'awaiting';
        activeAssigned = true;
      } else if (open.every(isWaitingApproval)) {
        // Only a sign-off is left here, and there is nothing to sign off yet
      } else if (phaseDone > 0 || !activeAssigned) {
        // Work has started here, or it is simply the next phase in line.
        status = 'active';
        activeAssigned = true;
      }

      const anchor = c.due_after === 'onboarding' || c.due_after === 'approval' ? c.due_after : null;
      const days = typeof c.due_days === 'number' ? c.due_days : null;
      const anchorDate = anchor === 'onboarding' ? onboardingCompletedAt : anchor === 'approval' ? approvalCompletedAt : null;
      if (anchor === 'onboarding' && days !== null) submitDays = days;

      // A phase that still holds an open approval is first working towards handing its
      // work to the client. That happens in the same window as the phase before it.
      const awaitingSignOff = anchor === 'approval' && c.tasks.some(isWaitingApproval) && submitDays !== null;
      let dueDate = anchor && days !== null && anchorDate ? addBusinessDays(anchorDate, days) : null;
      let dueHint = anchor && days !== null && !dueDate ? dueHintFor(anchor, days) : null;
      let dueKind: Phase['dueKind'] = 'due';
      if (awaitingSignOff) {
        dueKind = 'submit';
        dueDate = onboardingCompletedAt ? addBusinessDays(onboardingCompletedAt, submitDays!) : null;
        dueHint = dueDate ? null : dueHintFor('onboarding', submitDays!);
      }

      return {
        id: c.id,
        name: c.name,
        total: c.tasks.length,
        done: phaseDone,
        status,
        completedAt: status === 'done' ? latest(c.tasks.map((t) => t.completed_at)) : null,
        dueDate,
        dueHint,
        dueKind,
        // Once it is with the client, a late approval is not ours to chase as overdue
        overdue: Boolean(dueDate && status !== 'done' && status !== 'awaiting' && indiaDay(dueDate) < today),
        tasks: c.tasks,
      };
    });

  const notYetReached = new Set(phases.filter((p) => p.status === 'upcoming').flatMap((p) => p.tasks.map((t) => t.id)));

  const recentlyCompleted = ordered
    .flatMap((c) => c.tasks.map((t) => ({ ...t, phaseName: c.name })))
    .filter((t) => t.completed && t.completed_at)
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))
    .slice(0, 6);

  const hasOnboarding = onboardingTasks.length > 0;
  const stage: ProjectSummary['stage'] =
    all.length === 0
      ? { key: 'empty', label: 'No tasks yet' }
      : done === all.length
        ? { key: 'complete', label: 'Complete' }
        : hasOnboarding && !onboardingComplete
          ? { key: 'onboarding', label: 'Onboarding' }
          : phases.some((p) => p.status === 'awaiting')
            ? { key: 'pending_approval', label: 'Pending client approval' }
            : { key: 'in_progress', label: 'In progress' };

  return {
    total: all.length,
    done,
    percent: all.length === 0 ? 0 : Math.round((done / all.length) * 100),
    onboardingTasks,
    onboardingDone,
    hasOnboarding,
    onboardingComplete,
    onboardingCompletedAt,
    approvalCompletedAt,
    // "Waiting on the client" means they can act now: an approval only once there is something
    // to approve, and other tasks only once the project has reached their phase.
    clientPending: all.filter(
      (t) => !t.completed && isClientTask(t) && !isBlockedApproval(t) && (isOnboardingTask(t) || !notYetReached.has(t.id))
    ),
    teamPending: all.filter((t) => !t.completed && !isClientTask(t)),
    phases,
    stage,
    hasTimeline: phases.some((p) => p.dueDate || p.dueHint),
    recentlyCompleted,
  };
}
