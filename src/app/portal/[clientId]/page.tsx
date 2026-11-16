'use client';
import BrandLogo from '@/components/BrandLogo';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Bell, BellRing, ClipboardCheck, Eye, LayoutDashboard, LifeBuoy, Lock, LogOut, Mail } from 'lucide-react';
import { PortalCategory, PortalClient, Task } from '@/types/database';
import { summarizeProject } from '@/lib/progress';
import { capitalizeName } from '@/lib/names';
import OnboardingFlow from '@/components/portal/OnboardingFlow';
import ProjectDashboard from '@/components/portal/ProjectDashboard';
import WelcomeVideo from '@/components/portal/WelcomeVideo';
import AdPerformance from '@/components/ads/AdPerformance';
import UpdatesFeed from '@/components/portal/UpdatesInbox';
import WaitingOnYou from '@/components/portal/WaitingOnYou';
import { buildUpdates, countUnread } from '@/lib/updates';

// 'dashboard' is the Delivery tab: project progress and timeline. 'results' is ad performance.
type View = 'onboarding' | 'dashboard' | 'results' | 'updates' | 'support';

interface PortalData {
    client: PortalClient;
    operatorName: string | null;
    categories: PortalCategory[];
    viewer: { role: 'admin' | 'operator' | 'client'; username: string };
}

export default function ClientPortalPage() {
    const params = useParams();
    const clientId = params.clientId as string;
    const router = useRouter();

    const [data, setData] = useState<PortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState<View | null>(null);
    const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    // The welcome video: 'required' the first time, 'replay' when opened again by choice
    const [walkthrough, setWalkthrough] = useState<'required' | 'replay' | null>(null);
    const walkthroughDecided = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const savingRef = useRef(false);

    const load = useCallback(async (silent = false) => {
        try {
            const res = await fetch(`/api/portal/${clientId}`, { cache: 'no-store' });
            if (res.status === 401) {
                router.push('/client-login');
                return;
            }
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Unable to load project data');
            setData(body);
            setError('');
        } catch (err: any) {
            // A failed background refresh keeps what is already on screen.
            if (!silent) setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [clientId, router]);

    useEffect(() => {
        if (clientId) load();
    }, [clientId, load]);

    // Keep progress live while the page is open: the team ticks tasks on their side.
    useEffect(() => {
        const refresh = () => {
            // Not while a tick is being saved, or the refresh could briefly undo it on screen.
            if (document.visibilityState === 'visible' && !savingRef.current) load(true);
        };
        const interval = setInterval(refresh, 20000);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [load]);

    const summary = useMemo(() => summarizeProject(data?.categories ?? []), [data]);

    // The Updates inbox comes straight from the task board; only "last read" is stored.
    const updates = useMemo(() => (data ? buildUpdates(data.categories, data.client) : []), [data]);
    const [readAt, setReadAt] = useState<string | null | undefined>(undefined);
    const effectiveReadAt = readAt === undefined ? data?.client.updates_read_at ?? null : readAt;
    const unreadUpdates = countUnread(updates, effectiveReadAt);
    const nudgeWaiting = updates.some((u) => u.kind === 'nudge' && (!effectiveReadAt || u.at > effectiveReadAt));
    // What counted as read when the Updates tab was opened, so new items stay highlighted on that visit
    const [updatesSeenBefore, setUpdatesSeenBefore] = useState<string | null>(null);

    const isTeamPreview = data ? data.viewer.role !== 'client' : false;
    // Clients reach the dashboard once onboarding is done. The team can always look.
    const dashboardLocked = summary.hasOnboarding && !summary.onboardingComplete && !isTeamPreview;
    // Results open once an ad account is linked (and onboarding is done). The team can always look.
    const adsLinked = Boolean(data?.client.ads_linked);
    const resultsLocked = !isTeamPreview && (dashboardLocked || !adsLinked);
    const adsLive = adsLinked && data?.client.status === 'Launched';

    // Land on onboarding until it is finished, then on delivery, or on results once the ads are live.
    useEffect(() => {
        if (!data || view) return;
        setView(summary.hasOnboarding && !summary.onboardingComplete ? 'onboarding' : adsLive ? 'results' : 'dashboard');
    }, [data, view, summary.hasOnboarding, summary.onboardingComplete, adsLive]);

    // A client's first visit opens with the welcome video, full screen. It counts as
    // watched once its step is ticked; cards without that step remember it in the browser.
    const welcomeStep = summary.onboardingTasks.find((t) => t.task_key === 'watch_welcome') ?? null;
    const seenKey = `asr_welcome_video_seen_${clientId}`;

    useEffect(() => {
        if (!data || walkthroughDecided.current) return;
        walkthroughDecided.current = true;
        if (isTeamPreview) return;

        let seenHere = false;
        try { seenHere = localStorage.getItem(seenKey) === '1'; } catch { }

        if (summary.hasOnboarding && !summary.onboardingComplete) {
            // Onboarding open: they must watch it, and watching it ticks its step
            if (welcomeStep ? !welcomeStep.completed : !seenHere) setWalkthrough('required');
        } else if (!seenHere) {
            // Older cards, or onboarding already done: welcome them once, and let them close it
            setWalkthrough('replay');
        }
    }, [data, isTeamPreview, summary.hasOnboarding, summary.onboardingComplete, welcomeStep, seenKey]);

    const changeView = (next: View) => {
        if (next === 'updates' && view !== 'updates') {
            setUpdatesSeenBefore(effectiveReadAt);
            // Opening Updates reads them. The team's preview leaves the client's badge alone.
            if (unreadUpdates > 0 && data && data.viewer.role === 'client') {
                setReadAt(new Date().toISOString());
                fetch(`/api/portal/${clientId}/updates`, { method: 'POST' }).catch(() => { });
            }
        }
        setView(next);
        scrollRef.current?.scrollTo({ top: 0 });
    };

    const setTask = (taskId: string, patch: Partial<Task>) => {
        setData((prev) =>
            prev && {
                ...prev,
                categories: prev.categories.map((cat) => ({
                    ...cat,
                    tasks: cat.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
                })),
            }
        );
    };

    const handleToggle = async (task: Task, completed: boolean) => {
        setPendingTaskId(task.id);
        savingRef.current = true;
        setNotice('');
        // Show the tick straight away, then confirm with the server.
        setTask(task.id, { completed, completed_at: completed ? new Date().toISOString() : null });

        try {
            const res = await fetch(`/api/portal/${clientId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Unable to update the task');
            setTask(task.id, { completed: body.completed, completed_at: body.completed_at });
        } catch (err: any) {
            setTask(task.id, { completed: task.completed, completed_at: task.completed_at });
            setNotice(`${err.message}. Please try again.`);
        } finally {
            setPendingTaskId(null);
            savingRef.current = false;
        }
    };

    const finishWalkthrough = () => {
        const wasRequired = walkthrough === 'required';
        setWalkthrough(null);
        try { localStorage.setItem(seenKey, '1'); } catch { }
        if (wasRequired && welcomeStep && !welcomeStep.completed) handleToggle(welcomeStep, true);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push(isTeamPreview ? '/login' : '/client-login');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F5F6FA]">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-900 border-t-transparent" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F5F6FA] p-6">
                <div className="max-w-sm text-center">
                    <h1 className="text-2xl font-bold text-slate-900">We couldn&rsquo;t open your project</h1>
                    <p className="mt-2 text-slate-500">{error || 'Unable to load project data.'}</p>
                    <button
                        onClick={() => { setLoading(true); load(); }}
                        className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        Try again
                    </button>
                    <button onClick={() => router.push('/login')} className="mt-3 block w-full text-sm font-medium text-slate-500 hover:text-slate-900">
                        Return to login
                    </button>
                </div>
            </div>
        );
    }

    const { client, operatorName } = data;

    const tabs: Tab[] = [
        { id: 'onboarding', label: 'Onboarding', icon: ClipboardCheck, hidden: !summary.hasOnboarding },
        { id: 'dashboard', label: 'Delivery', icon: LayoutDashboard, locked: dashboardLocked, lockedHint: 'Opens once your onboarding is complete' },
        {
            id: 'results',
            label: 'Results',
            icon: BarChart3,
            locked: resultsLocked,
            lockedHint: dashboardLocked ? 'Opens once your onboarding is complete' : 'Opens once your ads are live',
        },
        { id: 'updates', label: 'Updates', icon: nudgeWaiting ? BellRing : Bell, badge: unreadUpdates, ring: nudgeWaiting },
        { id: 'support', label: 'Help', icon: LifeBuoy },
    ];

    return (
        <div ref={scrollRef} className="h-screen overflow-y-auto bg-[#F5F6FA]">
            {isTeamPreview && (
                <div className="flex items-center justify-center gap-3 bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
                    <Eye className="h-4 w-4 shrink-0" />
                    <span className="truncate">Team preview of {client.name}&rsquo;s portal</span>
                    <button
                        onClick={() => router.push(data.viewer.role === 'operator' ? '/operator' : '/')}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                    </button>
                </div>
            )}

            {walkthrough && (
                <WelcomeVideo
                    firstName={client.name.trim().split(/\s+/)[0]}
                    mustFinish={walkthrough === 'required'}
                    onFinish={finishWalkthrough}
                    onClose={() => {
                        setWalkthrough(null);
                        try { localStorage.setItem(seenKey, '1'); } catch { }
                    }}
                />
            )}

            <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <BrandLogo theme="dark" size={48} priority className="h-12 w-12 rounded-full" />
                        <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-bold tracking-tight text-slate-900">ASR Media Pro</p>
                            <p className="truncate text-xs font-medium text-slate-500">{client.business_name}</p>
                        </div>
                    </div>

                    <nav className="hidden items-center gap-1 rounded-full bg-slate-100 p-1 md:flex" aria-label="Portal sections">
                        {tabs.filter((t) => !t.hidden).map((tab) => (
                            <TabButton key={tab.id} tab={tab} active={view === tab.id} onClick={() => changeView(tab.id)} />
                        ))}
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>

            </header>

            {/* Phones: a bottom tab bar, like a mobile app, with every section in reach */}
            <nav
                className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
                aria-label="Portal sections"
            >
                <div className="mx-auto flex max-w-md">
                    {tabs.filter((t) => !t.hidden).map((tab) => (
                        <BottomTab key={tab.id} tab={tab} active={view === tab.id} onClick={() => changeView(tab.id)} />
                    ))}
                </div>
            </nav>

            <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-8">
                {notice && (
                    <div role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                        {notice}
                    </div>
                )}

                {view === 'onboarding' && summary.clientPending.length > 0 && (
                    // What is still waiting on the client, at first glance
                    <div className="mb-6">
                        <WaitingOnYou client={client} summary={summary} pendingTaskId={pendingTaskId} onToggle={handleToggle} />
                    </div>
                )}

                {view === 'onboarding' && (
                    <OnboardingFlow
                        client={client}
                        summary={summary}
                        operatorName={operatorName}
                        pendingTaskId={pendingTaskId}
                        onToggle={handleToggle}
                        onOpenDashboard={() => changeView('dashboard')}
                        onPlayWalkthrough={() => setWalkthrough(isTeamPreview || !welcomeStep || welcomeStep.completed ? 'replay' : 'required')}
                    />
                )}

                {view === 'dashboard' && (
                    <ProjectDashboard
                        client={client}
                        summary={summary}
                        operatorName={operatorName}
                        pendingTaskId={pendingTaskId}
                        onToggle={handleToggle}
                    />
                )}

                {view === 'results' && (
                    // The team preview shows exactly what the client sees.
                    <AdPerformance clientId={client.id} audience="client" />
                )}

                {view === 'updates' && (
                    <UpdatesFeed
                        updates={updates}
                        seenBefore={updatesSeenBefore}
                        isTeamPreview={isTeamPreview}
                        onOpenView={(next) => changeView(next)}
                    />
                )}

                {view === 'support' && (
                    <div className="mx-auto max-w-xl py-10 text-center sm:py-16">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <LifeBuoy className="h-8 w-8" />
                        </div>
                        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Need a hand?</h1>
                        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-500">
                            {operatorName
                                ? `${capitalizeName(operatorName)} is your project manager and your first point of contact. For anything else, email our support team.`
                                : 'For any question, issue or feedback, email our support team.'}
                        </p>
                        <a
                            href="mailto:support@asrmediapro.com"
                            className="mt-8 inline-flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-900 shadow-sm transition-colors hover:border-indigo-300 sm:text-xl"
                        >
                            <Mail className="h-5 w-5 shrink-0 text-indigo-600" />
                            <span className="truncate">support@asrmediapro.com</span>
                        </a>
                        <p className="mt-4 text-sm text-slate-500">
                            Monday to Friday, 10 AM to 6 PM. We usually reply within 24–48 hours.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

interface Tab {
    id: View;
    label: string;
    icon: typeof LayoutDashboard;
    locked?: boolean;
    lockedHint?: string;
    hidden?: boolean;
    badge?: number; // unread count
    ring?: boolean; // gently ring the icon (a nudge is waiting)
}

function Badge({ count, className = '' }: { count: number; className?: string }) {
    return (
        <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none tabular-nums text-white ring-2 ring-white ${className}`}>
            {count > 9 ? '9+' : count}
        </span>
    );
}

function TabButton({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
    const Icon = tab.locked ? Lock : tab.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={tab.locked}
            aria-current={active ? 'page' : undefined}
            title={tab.locked ? tab.lockedHint : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${active
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : tab.locked
                    ? 'cursor-not-allowed text-slate-400'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
        >
            <Icon className={`h-4 w-4 ${tab.ring && !active ? 'origin-top animate-[bell-ring_2.4s_ease-in-out_infinite]' : ''}`} />
            {tab.label}
            {!!tab.badge && <Badge count={tab.badge} />}
        </button>
    );
}

function BottomTab({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
    const Icon = tab.locked ? Lock : tab.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={tab.locked}
            aria-current={active ? 'page' : undefined}
            title={tab.locked ? tab.lockedHint : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-semibold transition-colors ${active ? 'text-indigo-700' : tab.locked ? 'text-slate-300' : 'text-slate-500 active:text-slate-900'}`}
        >
            {active && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-indigo-600" />}
            <span className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? 'bg-indigo-50' : ''}`}>
                <Icon className={`h-5 w-5 ${tab.ring && !active ? 'origin-top animate-[bell-ring_2.4s_ease-in-out_infinite]' : ''}`} />
                {!!tab.badge && <Badge count={tab.badge} className="absolute -top-1 right-0.5" />}
            </span>
            <span className="truncate">{tab.label}</span>
        </button>
    );
}
