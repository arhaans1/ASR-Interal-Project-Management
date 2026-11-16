import { CategoryLike, isApprovalTask, isClientTask, isOnboardingTask, summarizeProject } from '@/lib/progress';
import { Task } from '@/types/database';

// The client's Updates inbox, worked out from the task board itself: every tick by our team,
// every finished stage, work waiting for their review, the ad launch, and a daily nudge for
// whatever is still pending on their side. Nothing is typed or stored except when they last read.

export type UpdateKind = 'welcome' | 'done' | 'stage' | 'review' | 'live' | 'nudge';
export type UpdateView = 'onboarding' | 'dashboard' | 'results';

export interface UpdateItem {
    id: string;
    kind: UpdateKind;
    title: string;
    body?: string;
    items?: string[]; // nudges: what is still pending
    at: string; // ISO
    action?: { label: string; view: UpdateView };
}

// Nudges go out once a day at this hour, India time
const NUDGE_HOUR_IST = 10;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const LAUNCH_PHASE = /launch/i;
const LAUNCH_TASK = /launch (the )?ad|ad launch/i;

// The most recent 10:00 India time at or before `now`
export function lastNudgeTime(now: Date = new Date()): string {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const slot = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), NUDGE_HOUR_IST, 0, 0));
    if (slot.getTime() > ist.getTime()) slot.setUTCDate(slot.getUTCDate() - 1);
    return new Date(slot.getTime() - IST_OFFSET_MS).toISOString();
}

const latest = (dates: (string | null | undefined)[]) => (dates.filter(Boolean) as string[]).sort().pop() ?? null;

export function buildUpdates(
    categories: CategoryLike[],
    client: { created_at: string; business_name?: string; ads_linked?: boolean },
    now: Date = new Date()
): UpdateItem[] {
    const ordered = [...categories].sort((a, b) => a.order_index - b.order_index).filter((c) => c.tasks.length > 0);
    const summary = summarizeProject(ordered, now);
    const items: UpdateItem[] = [];

    items.push({
        id: 'welcome',
        kind: 'welcome',
        title: 'Welcome to your project portal',
        body: 'Updates from our team will show up here: finished work, things to review, and anything we need from you.',
        at: client.created_at,
    });

    const launchPhase = ordered.length && LAUNCH_PHASE.test(ordered[ordered.length - 1].name) ? ordered[ordered.length - 1] : null;
    let liveAnnounced = false;

    // When each task first became something the client could act on, for nudges
    const actionableSince = new Map<string, string>();
    let previousPhasesDoneAt: string = client.created_at;
    // When everything our team had to deliver before a point was done; null while some of it is open.
    // The client's own open items don't count: they never hold back an approval of delivered work.
    let teamWorkDoneAt: string | null = client.created_at;

    ordered.forEach((phase, index) => {
        const phaseDone = phase.tasks.every((t) => t.completed);
        const next = ordered.slice(index + 1).find((p) => p.tasks.some((t) => !t.completed)) ?? ordered[index + 1];

        for (const task of [...phase.tasks].sort((a, b) => a.order_index - b.order_index)) {
            // Approvals become actionable once our work listed before them is done
            if (isApprovalTask(task)) {
                if (teamWorkDoneAt) {
                    actionableSince.set(task.id, teamWorkDoneAt);
                    items.push({
                        id: `review-${task.id}`,
                        kind: 'review',
                        title: 'Ready for your review',
                        body: `${task.name}. Please take a look and approve it so we can move on.`,
                        at: teamWorkDoneAt,
                        action: task.completed ? undefined : { label: 'Review now', view: 'dashboard' },
                    });
                }
            } else if (isClientTask(task)) {
                actionableSince.set(task.id, isOnboardingTask(task) ? client.created_at : previousPhasesDoneAt);
            }

            // Every task our team ticks
            if (!isClientTask(task) && task.completed && task.completed_at) {
                if (LAUNCH_TASK.test(task.name)) {
                    liveAnnounced = true;
                    items.push({
                        id: `live-${task.id}`,
                        kind: 'live',
                        title: 'Your ads are live 🚀',
                        body: 'Your campaigns are running. Follow your results as they come in.',
                        at: task.completed_at,
                        action: client.ads_linked ? { label: 'See results', view: 'results' } : undefined,
                    });
                } else {
                    items.push({
                        id: `done-${task.id}`,
                        kind: 'done',
                        title: `Completed: ${task.name}`,
                        body: `Our team has finished this as part of ${phase.name}.`,
                        at: task.completed_at,
                    });
                }
            }

            if (!isClientTask(task)) {
                if (!task.completed) teamWorkDoneAt = null;
                else if (teamWorkDoneAt) teamWorkDoneAt = latest([teamWorkDoneAt, task.completed_at]) ?? teamWorkDoneAt;
            }
        }

        // A finished stage
        const doneAt = phaseDone ? latest(phase.tasks.map((t) => t.completed_at)) : null;
        if (doneAt) {
            if (phase === launchPhase && !liveAnnounced) {
                liveAnnounced = true;
                items.push({
                    id: `live-${phase.id}`,
                    kind: 'live',
                    title: 'Your ads are live 🚀',
                    body: 'Your campaigns are running. Follow your results as they come in.',
                    at: doneAt,
                    action: client.ads_linked ? { label: 'See results', view: 'results' } : undefined,
                });
            } else if (phase !== launchPhase) {
                const onboarding = phase.tasks.some(isOnboardingTask);
                items.push({
                    id: `stage-${phase.id}`,
                    kind: 'stage',
                    title: onboarding ? 'Onboarding complete 🎉' : `${phase.name} is complete 🎉`,
                    body: onboarding
                        ? `Thank you! Our team is now working on ${next && next !== phase ? next.name : 'your project'}.`
                        : next && next !== phase
                            ? `Next up: ${next.name}.`
                            : undefined,
                    at: doneAt,
                    action: { label: 'See progress', view: 'dashboard' },
                });
            }
            previousPhasesDoneAt = latest([previousPhasesDoneAt, doneAt]) ?? previousPhasesDoneAt;
        }
    });

    // Today's nudge: whatever the client could have done before this morning's 10am and still hasn't
    const nudgeAt = lastNudgeTime(now);
    const pending: Task[] = summary.clientPending.filter((t) => (actionableSince.get(t.id) ?? client.created_at) < nudgeAt);
    if (pending.length > 0) {
        items.push({
            id: `nudge-${nudgeAt.slice(0, 10)}`,
            kind: 'nudge',
            title: pending.length === 1 ? `Still pending: ${pending[0].name}` : `${pending.length} things are still waiting on you`,
            body: `Your project moves as soon as ${pending.length === 1 ? 'this is' : 'these are'} done. It only takes a few minutes.`,
            items: pending.length === 1 ? undefined : pending.map((t) => t.name),
            at: nudgeAt,
        });
    }

    // Newest first; updates at the same moment keep their board order, later steps on top
    return items
        .map((item, seq) => ({ item, seq }))
        .filter(({ item }) => item.at && item.at <= now.toISOString())
        .sort((a, b) => (a.item.at === b.item.at ? b.seq - a.seq : a.item.at < b.item.at ? 1 : -1))
        .map(({ item }) => item)
        .slice(0, 40);
}

export const countUnread = (items: UpdateItem[], readAt: string | null | undefined) =>
    items.filter((i) => !readAt || i.at > readAt).length;
