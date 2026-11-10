'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, FolderOpen, Loader2, Lock, PartyPopper, UserRound } from 'lucide-react';
import { PortalClient, Task } from '@/types/database';
import { funnelLongName, guideFor } from '@/lib/funnelTemplates';
import { formatDate, ProjectSummary } from '@/lib/progress';
import ProgressRing from './ProgressRing';
import StepDetail from './StepDetail';

interface OnboardingFlowProps {
    client: PortalClient;
    summary: ProjectSummary;
    operatorName: string | null;
    pendingTaskId: string | null;
    onToggle: (task: Task, completed: boolean) => void;
    onOpenDashboard: () => void;
}

export default function OnboardingFlow({
    client,
    summary,
    operatorName,
    pendingTaskId,
    onToggle,
    onOpenDashboard,
}: OnboardingFlowProps) {
    const steps = summary.onboardingTasks;
    const done = summary.onboardingDone;
    const percent = steps.length === 0 ? 0 : Math.round((done / steps.length) * 100);
    const firstName = client.name.trim().split(/\s+/)[0];

    // The video comes first: every other step stays locked until it has been watched.
    const videoStep = steps.find((s) => s.task_key === 'watch_video');
    const isLocked = (step: Task) => Boolean(videoStep && !videoStep.completed && step.id !== videoStep.id);

    const nextStep = steps.find((s) => !s.completed && !isLocked(s)) ?? null;
    const [openId, setOpenId] = useState<string | null>(nextStep?.id ?? null);

    // When a step is ticked, move on to the next one.
    useEffect(() => {
        setOpenId((current) => {
            const currentStep = steps.find((s) => s.id === current);
            if (currentStep && !currentStep.completed) return current;
            return nextStep?.id ?? null;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [done]);

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
                <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-indigo-600/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-40 left-1/4 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />

                <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
                            {summary.onboardingComplete ? 'Onboarding complete' : 'Onboarding'}
                        </p>
                        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                            Welcome to ASR Media Pro, {firstName}.
                        </h1>
                        <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg">
                            {summary.onboardingComplete
                                ? `Thank you. We have everything we need to build your ${funnelLongName(client.funnel_type)}.`
                                : `Let's start with the onboarding for your ${funnelLongName(client.funnel_type)}. Work through the steps below and tick each one off as you finish it.`}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {client.drive_folder_url && (
                                <a
                                    href={client.drive_folder_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                                >
                                    <FolderOpen className="h-4 w-4 text-amber-500" />
                                    Open your Drive folder
                                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                                </a>
                            )}
                            {summary.onboardingComplete && (
                                <button
                                    type="button"
                                    onClick={onOpenDashboard}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                                >
                                    Open your project dashboard
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-5 md:flex-col md:gap-3">
                        <ProgressRing percent={percent} size={132} stroke={11} label="Onboarding progress">
                            <span className="text-3xl font-bold tabular-nums">{done}<span className="text-lg text-slate-400">/{steps.length}</span></span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">steps done</span>
                        </ProgressRing>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* Steps */}
                <section aria-label="Onboarding steps" className="min-w-0">
                    {summary.onboardingComplete && (
                        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200/80">
                            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                            <div className="text-sm leading-relaxed text-emerald-950">
                                <p className="font-bold">You&rsquo;re all set.</p>
                                <p className="text-emerald-900/80">
                                    Our team has started work. Follow every step of the build on your project dashboard.
                                </p>
                            </div>
                        </div>
                    )}

                    <ol className="space-y-3">
                        {steps.map((step, index) => {
                            const guide = guideFor(step.task_key);
                            const locked = isLocked(step);
                            const open = openId === step.id && !locked;
                            const busy = pendingTaskId === step.id;

                            return (
                                <li
                                    key={step.id}
                                    className={`rounded-2xl border bg-white transition-shadow ${open
                                        ? 'border-indigo-200 shadow-lg shadow-indigo-950/5 ring-4 ring-indigo-500/5'
                                        : 'border-slate-200/80 shadow-sm'
                                        } ${locked ? 'opacity-60' : ''}`}
                                >
                                    <button
                                        type="button"
                                        disabled={locked}
                                        aria-expanded={open}
                                        onClick={() => setOpenId(open ? null : step.id)}
                                        className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5 disabled:cursor-not-allowed"
                                    >
                                        <span
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${step.completed
                                                ? 'bg-emerald-500 text-white'
                                                : open
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {step.completed ? <Check className="h-5 w-5" strokeWidth={3} /> : locked ? <Lock className="h-4 w-4" /> : index + 1}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                {guide.eyebrow}
                                            </span>
                                            <span className={`block text-base font-semibold leading-snug ${step.completed ? 'text-slate-500' : 'text-slate-900'}`}>
                                                {step.name}
                                            </span>
                                        </span>

                                        {step.completed ? (
                                            <span className="hidden shrink-0 text-xs font-semibold text-emerald-600 sm:block">
                                                Done{step.completed_at ? ` · ${formatDate(step.completed_at)}` : ''}
                                            </span>
                                        ) : locked ? (
                                            <span className="hidden shrink-0 text-xs font-medium text-slate-400 sm:block">Watch the video first</span>
                                        ) : nextStep?.id === step.id && !open ? (
                                            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">Next up</span>
                                        ) : null}

                                        {!locked && (
                                            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                                        )}
                                    </button>

                                    {open && (
                                        <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5 sm:pl-[72px]">
                                            <StepDetail task={step} client={client} />

                                            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                                                {step.completed ? (
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => onToggle(step, false)}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                                                    >
                                                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                                        Mark as not done
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => onToggle(step, true)}
                                                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
                                                    >
                                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />}
                                                        {guide.doneLabel}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </section>

                {/* Side */}
                <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900">What happens next</h2>
                        <ol className="mt-4 space-y-4">
                            {[
                                { title: 'You complete onboarding', text: 'Share your details, assets and access.', active: !summary.onboardingComplete, done: summary.onboardingComplete },
                                { title: 'We start building', text: 'Research, strategy, copy, creatives and your funnel.', active: summary.onboardingComplete, done: false },
                                { title: 'You track every step', text: 'Your dashboard opens with live progress and a timeline.', active: false, done: false },
                            ].map((item, i) => (
                                <li key={item.title} className="flex gap-3">
                                    <span
                                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${item.done
                                            ? 'bg-emerald-500 text-white'
                                            : item.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                            }`}
                                    >
                                        {item.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                                        <span className="block text-sm leading-snug text-slate-500">{item.text}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>

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

                    <p className="px-1 text-sm leading-relaxed text-slate-500">
                        Our team is available Monday to Friday, 10 AM to 6 PM, excluding public holidays.
                    </p>
                </aside>
            </div>
        </div>
    );
}
