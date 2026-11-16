import { addBusinessDays, isApprovalTask, isOnboardingTask, Phase, ProjectSummary } from '@/lib/progress';
import { Task } from '@/types/database';

// The client's journey to launch, as a row of milestones:
//   Onboarding → Welcome call → Stage 1 … Stage N → (your approval) … → Ads live
// Built from the project's phases, so it works for every funnel template.

export type MilestoneKind = 'kickoff' | 'call' | 'stage' | 'approval' | 'launch';
export type MilestoneStatus = 'done' | 'current' | 'upcoming';
export type DateKind = 'done' | 'due' | 'estimate';
export type MilestoneGroup = 'start' | 'build' | 'launch';

export interface Milestone {
    id: string;
    kind: MilestoneKind;
    tag: string; // KICK-OFF, STAGE 1, YOUR APPROVAL, LAUNCH
    title: string;
    group: MilestoneGroup;
    status: MilestoneStatus;
    date: string | null; // ISO
    dateKind: DateKind;
    overdue: boolean;
    waitingOnClient: boolean; // the client's move (onboarding, approval, recordings)
}

export interface Journey {
    milestones: Milestone[];
    current: Milestone | null; // null once everything is done
    launch: Milestone | null;
    stageCount: number;
}

// Time we allow the client to review before the next step, for estimates only
const REVIEW_DAYS = 2;
// A phase without a due rule (e.g. recordings and launch) is estimated this long after the one before it
const OPEN_PHASE_DAYS = 5;

const CALL_PATTERN = /\b(welcome|kick-?off|onboarding|strategy)\s+call\b/i;
const LAUNCH_PATTERN = /launch/i;

const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

export function buildJourney(summary: ProjectSummary, now: Date = new Date()): Journey | null {
    const phases = summary.phases;
    if (phases.length < 2) return null;

    const today = now.toISOString();
    const onboardingPhase = phases.find((p) => p.tasks.some(isOnboardingTask)) ?? null;
    const workPhases = phases.filter((p) => p !== onboardingPhase);
    if (workPhases.length === 0) return null;

    const callTask: Task | undefined = workPhases.flatMap((p) => p.tasks).find((t) => t.owner !== 'client' && CALL_PATTERN.test(t.name));
    const approvalTasks = phases.flatMap((p) => p.tasks).filter(isApprovalTask);
    const approvalPhase = phases.find((p) => p.tasks.some(isApprovalTask)) ?? null;
    // A phase holding nothing but the approval (VSL and Webinar) becomes the approval milestone itself
    const approvalOnlyPhase = approvalPhase && approvalPhase.tasks.every(isApprovalTask) ? approvalPhase : null;
    const lastPhase = workPhases[workPhases.length - 1];
    const launchPhase = LAUNCH_PATTERN.test(lastPhase.name) ? lastPhase : null;

    type Draft = Omit<Milestone, 'status'> & { done: boolean };
    const drafts: Draft[] = [];
    let cursor: string | null = null; // the latest date so far, for estimates
    const push = (d: Draft) => {
        // Estimates never fall before today or before the milestone ahead of them
        if (d.dateKind === 'estimate' && d.date) d.date = later(later(d.date, today), cursor);
        drafts.push(d);
        if (d.date) cursor = later(cursor, d.date);
    };

    // Onboarding: the client's part, ends when every onboarding step is ticked
    const onboardingAt = summary.onboardingCompletedAt;
    if (onboardingPhase) {
        push({
            id: `kickoff-${onboardingPhase.id}`,
            kind: 'kickoff',
            tag: 'Start',
            title: 'Onboarding',
            group: 'start',
            done: summary.onboardingComplete,
            date: onboardingAt ?? today,
            dateKind: onboardingAt ? 'done' : 'estimate',
            overdue: false,
            waitingOnClient: !summary.onboardingComplete,
        });
    }
    const onboardingEstimate = onboardingAt ?? cursor ?? today;

    if (callTask) {
        push({
            id: `call-${callTask.id}`,
            kind: 'call',
            tag: 'Kick-off',
            title: 'Welcome call',
            group: 'start',
            done: callTask.completed,
            date: callTask.completed ? callTask.completed_at ?? onboardingEstimate : addBusinessDays(onboardingEstimate, 1),
            dateKind: callTask.completed && callTask.completed_at ? 'done' : 'estimate',
            overdue: false,
            waitingOnClient: false,
        });
    }

    let approvalEstimate: string | null = summary.approvalCompletedAt;
    let stageNumber = 0;

    const phaseDate = (p: Phase): { date: string | null; dateKind: DateKind } => {
        if (p.status === 'done') return { date: p.completedAt, dateKind: 'done' };
        // A phase still holding the approval shows when its work goes in for review ("submit"),
        // not when the stage ends: that is counted from the approval.
        if (p.dueDate && p.dueKind !== 'submit') return { date: p.dueDate, dateKind: 'due' };
        if (p.dueAfter === 'onboarding' && p.dueDays !== null) return { date: addBusinessDays(onboardingEstimate, p.dueDays), dateKind: 'estimate' };
        if (p.dueAfter === 'approval' && p.dueDays !== null) {
            const anchor = approvalEstimate ?? addBusinessDays(cursor ?? today, REVIEW_DAYS);
            return { date: addBusinessDays(anchor, p.dueDays), dateKind: 'estimate' };
        }
        return { date: addBusinessDays(cursor ?? today, OPEN_PHASE_DAYS), dateKind: 'estimate' };
    };

    const pushApproval = () => {
        if (approvalTasks.length === 0) return;
        const done = approvalTasks.every((t) => t.completed);
        const date = done ? summary.approvalCompletedAt : addBusinessDays(cursor ?? today, REVIEW_DAYS);
        approvalEstimate = done ? summary.approvalCompletedAt : date;
        push({
            id: `approval-${approvalTasks[0].id}`,
            kind: 'approval',
            tag: 'Your approval',
            title: approvalTasks[0].name.replace(/^review and /i, '').replace(/^./, (c) => c.toUpperCase()),
            group: 'build',
            done,
            date,
            dateKind: done ? 'done' : 'estimate',
            overdue: false,
            waitingOnClient: !done,
        });
    };

    for (const phase of workPhases) {
        if (phase === approvalOnlyPhase) {
            pushApproval();
            continue;
        }
        // The approval happens before the phase that holds it gets going (CAM: the course outline)
        if (phase === approvalPhase) pushApproval();

        const isLaunch = phase === launchPhase;
        if (!isLaunch) stageNumber += 1;
        const { date, dateKind } = phaseDate(phase);
        push({
            id: `phase-${phase.id}`,
            kind: isLaunch ? 'launch' : 'stage',
            tag: isLaunch ? 'Launch' : `Stage ${stageNumber}`,
            title: isLaunch ? 'Ads go live' : phase.name,
            group: isLaunch ? 'launch' : 'build',
            done: phase.status === 'done',
            date,
            dateKind,
            overdue: phase.overdue,
            waitingOnClient: phase.tasks.some((t) => !t.completed && t.owner === 'client'),
        });
    }

    // Everything before the first open milestone is done; that one is where the client is now.
    const firstOpen = drafts.findIndex((d) => !d.done);
    const milestones: Milestone[] = drafts.map(({ done, ...m }, i) => ({
        ...m,
        status: done ? 'done' : i === firstOpen ? 'current' : 'upcoming',
    }));

    return {
        milestones,
        current: firstOpen >= 0 ? milestones[firstOpen] : null,
        launch: milestones.find((m) => m.kind === 'launch') ?? null,
        stageCount: stageNumber,
    };
}
