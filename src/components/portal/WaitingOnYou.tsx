'use client';

import { useState } from 'react';
import { Check, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { PortalClient, Task } from '@/types/database';
import { guideFor } from '@/lib/funnelTemplates';
import { ProjectSummary } from '@/lib/progress';
import StepDetail from './StepDetail';

// "Waiting on you": everything the client can do right now, shaking gently until they open one.
// Shown on the Delivery tab and at the top of the Onboarding tab.
export default function WaitingOnYou({
    client,
    summary,
    pendingTaskId,
    onToggle,
}: {
    client: PortalClient;
    summary: ProjectSummary;
    pendingTaskId: string | null;
    onToggle: (task: Task, completed: boolean) => void;
}) {
    const [openActionId, setOpenActionId] = useState<string | null>(null);
    if (summary.clientPending.length === 0) return null;

    return (
        <section
                className={`rounded-2xl border-2 border-orange-400 bg-orange-100/80 p-5 shadow-lg shadow-orange-300/50 ${openActionId === null ? 'attention-shake' : ''}`}
                aria-labelledby="needs-you"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-600" />
                    <h2 id="needs-you" className="text-sm font-bold text-orange-950">
                        Waiting on you · {summary.clientPending.length}
                    </h2>
                </div>
                <ul className="mt-3 space-y-2">
                    {summary.clientPending.map((task) => {
                        const busy = pendingTaskId === task.id;
                        const open = openActionId === task.id;
                        return (
                            <li key={task.id} className="rounded-xl bg-white ring-1 ring-orange-300">
                                <div className="flex items-center gap-3 px-3.5 py-3">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => onToggle(task, true)}
                                        aria-label={`Mark "${task.name}" as done`}
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-transparent transition-colors hover:border-emerald-500 hover:text-emerald-500 disabled:opacity-60"
                                    >
                                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpenActionId(open ? null : task.id)}
                                        aria-expanded={open}
                                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                                    >
                                        <span className="text-sm font-semibold leading-snug text-slate-900">{task.name}</span>
                                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-500">
                                            How to
                                            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                        </span>
                                    </button>
                                </div>
                                {open && (
                                    <div className="border-t border-orange-100 px-3.5 pb-4 pt-3 sm:pl-[52px]">
                                        <StepDetail task={task} client={client} />
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => onToggle(task, true)}
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                                        >
                                            <Check className="h-4 w-4" strokeWidth={3} />
                                            {guideFor(task.task_key).doneLabel}
                                        </button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
    );
}
