'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, CircleDashed, Clock3, FolderOpen, Link as LinkIcon, Loader2, Sparkles, UserRound } from 'lucide-react';
import { PortalClient, Task } from '@/types/database';
import { funnelLongName, guideFor } from '@/lib/funnelTemplates';
import { formatDate, isClientTask, Phase, ProjectSummary } from '@/lib/progress';
import RichTextDisplay from '@/components/RichTextDisplay';
import ProgressRing from './ProgressRing';
import StepDetail from './StepDetail';

interface ProjectDashboardProps {
    client: PortalClient;
    summary: ProjectSummary;
    operatorName: string | null;
    pendingTaskId: string | null;
    onToggle: (task: Task, completed: boolean) => void;
}

const phaseLabel: Record<Phase['status'], string> = {
    done: 'Completed',
    active: 'In progress',
    upcoming: 'Upcoming',
};

export default function ProjectDashboard({ client, summary, operatorName, pendingTaskId, onToggle }: ProjectDashboardProps) {
    const activePhase = summary.phases.find((p) => p.status === 'active');
    const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
    const [openActionId, setOpenActionId] = useState<string | null>(null);

    // The phase being worked on starts open; the rest follow the viewer's clicks.
    const isOpen = (phase: Phase) => openPhases[phase.id] ?? phase.id === activePhase?.id;
    const togglePhase = (phase: Phase) => setOpenPhases((prev) => ({ ...prev, [phase.id]: !isOpen(phase) }));

    const allDone = summary.total > 0 && summary.done === summary.total;
    const phasesDone = summary.phases.filter((p) => p.status === 'done').length;

    return (
        <div className="space-y-6">
            {/* Overview */}
            <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10">
                <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-indigo-600/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-6">
                        <ProgressRing percent={summary.percent} size={128} stroke={11} label="Overall project progress">
                            <span className="text-3xl font-bold tabular-nums">{summary.percent}%</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">complete</span>
                        </ProgressRing>
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
                                {client.funnel_type ? funnelLongName(client.funnel_type) : 'Your project'}
                            </p>
                            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{client.business_name}</h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                                {allDone
                                    ? 'Everything on your project is complete.'
                                    : activePhase
                                        ? <>Now working on <span className="font-semibold text-white">{activePhase.name}</span> · phase {phasesDone + 1} of {summary.phases.length}</>
                                        : 'Your project is being set up.'}
                            </p>
                        </div>
                    </div>

                    <dl className="grid grid-cols-3 gap-3 sm:gap-4">
                        {[
                            { label: 'Completed', value: summary.done, tone: 'text-emerald-300' },
                            { label: 'In progress', value: summary.teamPending.length, tone: 'text-white' },
                            { label: 'Needs you', value: summary.clientPending.length, tone: summary.clientPending.length > 0 ? 'text-amber-300' : 'text-white' },
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-2xl bg-white/[0.06] px-4 py-3.5 ring-1 ring-white/10 sm:min-w-[112px]">
                                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</dt>
                                <dd className={`mt-1 text-3xl font-bold tabular-nums ${stat.tone}`}>{stat.value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-6">
                    {/* Needs you */}
                    {summary.clientPending.length > 0 && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm" aria-labelledby="needs-you">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-amber-600" />
                                <h2 id="needs-you" className="text-sm font-bold text-amber-950">
                                    Waiting on you · {summary.clientPending.length}
                                </h2>
                            </div>
                            <ul className="mt-3 space-y-2">
                                {summary.clientPending.map((task) => {
                                    const busy = pendingTaskId === task.id;
                                    const open = openActionId === task.id;
                                    return (
                                        <li key={task.id} className="rounded-xl bg-white ring-1 ring-amber-200/70">
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
                                                <div className="border-t border-amber-100 px-3.5 pb-4 pt-3 sm:pl-[52px]">
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
                    )}

                    {/* Timeline */}
                    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="timeline">
                        <div className="flex items-baseline justify-between gap-4">
                            <h2 id="timeline" className="text-lg font-bold tracking-tight text-slate-900">Project timeline</h2>
                            <p className="text-sm font-medium text-slate-500">
                                {summary.done} of {summary.total} tasks done
                            </p>
                        </div>

                        {summary.phases.length === 0 ? (
                            <div className="mt-6 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                                Your project plan will appear here shortly.
                            </div>
                        ) : (
                            <ol className="mt-6">
                                {summary.phases.map((phase, index) => {
                                    const last = index === summary.phases.length - 1;
                                    const open = isOpen(phase);
                                    const phasePercent = Math.round((phase.done / phase.total) * 100);

                                    return (
                                        <li key={phase.id} className="relative flex gap-4">
                                            {/* Rail */}
                                            <div className="flex flex-col items-center">
                                                <span
                                                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${phase.status === 'done'
                                                        ? 'bg-emerald-500 text-white'
                                                        : phase.status === 'active'
                                                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                                                            : 'border-2 border-slate-200 bg-white text-slate-400'
                                                        }`}
                                                >
                                                    {phase.status === 'done' ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                                                </span>
                                                {!last && (
                                                    <span className={`w-0.5 flex-1 ${phase.status === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                                                )}
                                            </div>

                                            <div className={`min-w-0 flex-1 ${last ? '' : 'pb-6'}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePhase(phase)}
                                                    aria-expanded={open}
                                                    className="flex w-full items-start justify-between gap-3 text-left"
                                                >
                                                    <span className="min-w-0">
                                                        <span className={`block text-base font-semibold ${phase.status === 'upcoming' ? 'text-slate-500' : 'text-slate-900'}`}>
                                                            {phase.name}
                                                        </span>
                                                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                                                            <span
                                                                className={`font-semibold ${phase.status === 'done'
                                                                    ? 'text-emerald-600'
                                                                    : phase.status === 'active'
                                                                        ? 'text-indigo-600'
                                                                        : 'text-slate-400'
                                                                    }`}
                                                            >
                                                                {phaseLabel[phase.status]}
                                                            </span>
                                                            <span aria-hidden>·</span>
                                                            <span>{phase.done} of {phase.total}</span>
                                                            {phase.completedAt && (
                                                                <>
                                                                    <span aria-hidden>·</span>
                                                                    <span>{formatDate(phase.completedAt)}</span>
                                                                </>
                                                            )}
                                                        </span>
                                                    </span>
                                                    <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                                                </button>

                                                {phase.status === 'active' && (
                                                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                        <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${phasePercent}%` }} />
                                                    </div>
                                                )}

                                                {open && (
                                                    <ul className="mt-3 space-y-1.5">
                                                        {phase.tasks.map((task) => (
                                                            <li key={task.id} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                                                                {task.completed ? (
                                                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                                                        <Check className="h-3 w-3" strokeWidth={3.5} />
                                                                    </span>
                                                                ) : (
                                                                    <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                                                                )}
                                                                <span className={`min-w-0 flex-1 text-sm leading-snug ${task.completed ? 'text-slate-500' : 'font-medium text-slate-800'}`}>
                                                                    {task.name}
                                                                </span>
                                                                {isClientTask(task) && !task.completed && (
                                                                    <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">You</span>
                                                                )}
                                                                {task.completed && task.completed_at && (
                                                                    <span className="shrink-0 text-xs text-slate-400">{formatDate(task.completed_at)}</span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>
                </div>

                {/* Side */}
                <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
                    {operatorName && (
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <UserRound className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Your project manager</span>
                                <span className="block truncate text-base font-semibold text-slate-900">{operatorName}</span>
                            </span>
                        </div>
                    )}

                    {client.drive_folder_url && (
                        <a
                            href={client.drive_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors hover:border-slate-300"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                                <FolderOpen className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-base font-semibold text-slate-900">Your Drive folder</span>
                                <span className="block text-sm text-slate-500">Everything we build for you</span>
                            </span>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </a>
                    )}

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Clock3 className="h-4 w-4 text-slate-400" />
                            Recently completed
                        </h2>
                        {summary.recentlyCompleted.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">Finished work will show up here.</p>
                        ) : (
                            <ul className="mt-3 space-y-3">
                                {summary.recentlyCompleted.map((task) => (
                                    <li key={task.id} className="flex gap-2.5">
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium leading-snug text-slate-800">{task.name}</span>
                                            <span className="block text-xs text-slate-500">
                                                {formatDate(task.completed_at)} · {isClientTask(task) ? 'You' : 'ASR team'}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {client.important_links && (
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <LinkIcon className="h-4 w-4 text-slate-400" />
                                Important links
                            </h2>
                            <div className="mt-3 text-sm">
                                <RichTextDisplay content={client.important_links} />
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
