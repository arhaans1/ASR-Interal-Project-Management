'use client';
import BrandLogo from '@/components/BrandLogo';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Calendar, CalendarClock, Check, ChevronRight, ExternalLink, FolderOpen, Hourglass, LayoutGrid, Loader2, LogOut, Menu, Users, Wrench, X } from 'lucide-react';
import { PortalCategory, PortalClient, Task } from '@/types/database';
import { funnelLabel } from '@/lib/funnelTemplates';
import { formatDate, isClientTask, ProjectSummary, StageKey, summarizeProject } from '@/lib/progress';
import { buildJourney } from '@/lib/journey';
import JourneyTimeline from '@/components/portal/JourneyTimeline';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';

interface ClientEntry {
    client: PortalClient;
    categories: PortalCategory[];
}

interface WorkspaceData {
    viewer: { role: 'operator'; userId: string; username: string };
    clients: ClientEntry[];
}

const stageStyles: Record<StageKey, string> = {
    empty: 'bg-slate-100 text-slate-600',
    onboarding: 'bg-violet-100 text-violet-800',
    pending_approval: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    complete: 'bg-emerald-100 text-emerald-800',
};

export default function OperatorWorkspacePage() {
    const router = useRouter();
    const [data, setData] = useState<WorkspaceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // The client open in the centre (null = Overview). Remembered for this browser tab.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    useEffect(() => {
        try {
            setSelectedId(sessionStorage.getItem('operator-selected-client'));
        } catch { }
    }, []);
    const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    const savingRef = useRef(false);

    const load = useCallback(async (silent = false) => {
        try {
            const res = await fetch('/api/operator/clients', { cache: 'no-store' });
            if (res.status === 401 || res.status === 403) {
                router.push('/login');
                return;
            }
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Unable to load clients');
            setData(body);
            setError('');
        } catch (err: any) {
            if (!silent) setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        load();
    }, [load]);

    // Clients tick their tasks in the portal; keep this view current.
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible' && !savingRef.current) load(true);
        };
        const interval = setInterval(refresh, 20000);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [load]);

    const entries = useMemo(
        () => (data?.clients ?? []).map((entry) => ({ ...entry, summary: summarizeProject(entry.categories) })),
        [data]
    );

    const totals = useMemo(
        () => ({
            clients: entries.length,
            onboarding: entries.filter((e) => e.summary.hasOnboarding && !e.summary.onboardingComplete).length,
            pendingApproval: entries.filter((e) => e.summary.stage.key === 'pending_approval').length,
            waitingOnClient: entries.reduce((n, e) => n + e.summary.clientPending.length, 0),
            onUs: entries.reduce((n, e) => n + e.summary.teamPending.length, 0),
        }),
        [entries]
    );

    const setTask = (clientId: string, taskId: string, patch: Partial<Task>) => {
        setData((prev) =>
            prev && {
                ...prev,
                clients: prev.clients.map((entry) =>
                    entry.client.id !== clientId
                        ? entry
                        : {
                            ...entry,
                            categories: entry.categories.map((cat) => ({
                                ...cat,
                                tasks: cat.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
                            })),
                        }
                ),
            }
        );
    };

    const handleToggle = async (clientId: string, task: Task, completed: boolean) => {
        setPendingTaskId(task.id);
        savingRef.current = true;
        setNotice('');
        setTask(clientId, task.id, { completed, completed_at: completed ? new Date().toISOString() : null });

        try {
            const res = await fetch(`/api/portal/${clientId}/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Unable to update the task');
        } catch (err: any) {
            setTask(clientId, task.id, { completed: task.completed, completed_at: task.completed_at });
            setNotice(`${err.message}. Please try again.`);
        } finally {
            setPendingTaskId(null);
            savingRef.current = false;
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
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
                    <h1 className="text-2xl font-bold text-slate-900">Couldn&rsquo;t load your clients</h1>
                    <p className="mt-2 text-slate-500">{error}</p>
                    <button
                        onClick={() => { setLoading(true); load(); }}
                        className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const selected = entries.find((e) => e.client.id === selectedId) ?? null;
    const select = (id: string | null) => {
        setSelectedId(id);
        setMenuOpen(false);
        try {
            if (id) sessionStorage.setItem('operator-selected-client', id);
            else sessionStorage.removeItem('operator-selected-client');
        } catch { }
        mainRef.current?.scrollTo({ top: 0 });
    };

    return (
        <div className="flex h-screen bg-[#F5F6FA]">
            {/* Phones: a top bar opens the client list */}
            <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl md:hidden">
                <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open client list"
                    className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <p className="min-w-0 truncate text-sm font-bold text-slate-900">{selected ? selected.client.name : 'My clients'}</p>
            </div>
            {menuOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)} />}

            {/* Left panel: the same shape as the team workspace sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-80 shrink-0 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 md:static md:z-20 md:translate-x-0 ${menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
            >
                <div className="p-6 pb-2">
                    <div className="mb-8 flex items-center gap-3">
                        <BrandLogo theme="dark" size={56} priority className="-ml-1 h-14 w-14 rounded-full" />
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900">ASR Media Pro</h1>
                            <p className="text-xs font-medium text-slate-500">Operator workspace</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMenuOpen(false)}
                            aria-label="Close client list"
                            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="-mt-4 mb-3">
                        <WorkspaceSwitcher current="operator" />
                    </div>
                    <button
                        type="button"
                        onClick={() => select(null)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${!selected ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'}`}
                    >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${!selected ? 'bg-white/15 text-white' : 'bg-white text-indigo-600 ring-1 ring-slate-200'}`}>
                            <LayoutGrid className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold">Overview</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <p className="mb-1 flex items-center justify-between px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-900">
                        <span className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            My clients
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums">{entries.length}</span>
                    </p>
                    {entries.length === 0 ? (
                        <p className="px-2.5 py-3 text-xs leading-relaxed text-slate-500">No clients assigned to you yet.</p>
                    ) : (
                        <div className="space-y-1">
                            {entries.map(({ client, summary }) => {
                                const active = selected?.client.id === client.id;
                                const stage = stageFor(client, summary);
                                return (
                                    <button
                                        key={client.id}
                                        type="button"
                                        onClick={() => select(client.id)}
                                        className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-150 ${active ? 'bg-slate-900 text-white shadow-md' : 'hover:bg-slate-50'}`}
                                    >
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900'}`}
                                        >
                                            {client.name.trim().slice(0, 2).toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-sm font-semibold ${active ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{client.name}</span>
                                            <span className={`block truncate text-[11px] font-medium ${active ? 'text-slate-300' : 'text-slate-400'}`}>{stage.label}</span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-1.5">
                                            {summary.clientPending.length > 0 && (
                                                <span
                                                    title={`${summary.clientPending.length} waiting on the client`}
                                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${active ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-100 text-amber-700'}`}
                                                >
                                                    {summary.clientPending.length}
                                                </span>
                                            )}
                                            <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-200/80 p-4">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
                    >
                        <span className="rounded-lg bg-gray-100 p-1.5">
                            <LogOut className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wide">Sign out</span>
                    </button>
                </div>
            </aside>

            <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-20 md:p-6 lg:p-8">
                {notice && (
                    <div role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                        {notice}
                    </div>
                )}

                {selected ? (
                    <ClientView
                        entry={selected}
                        pendingTaskId={pendingTaskId}
                        onToggle={(task, completed) => handleToggle(selected.client.id, task, completed)}
                    />
                ) : (
                    <Overview username={data.viewer.username} entries={entries} totals={totals} onSelect={select} />
                )}
            </main>
        </div>
    );
}

type Entry = ClientEntry & { summary: ProjectSummary };

function stageFor(client: PortalClient, summary: ProjectSummary) {
    const label =
        summary.stage.key === 'onboarding'
            ? `Onboarding · ${summary.onboardingDone}/${summary.onboardingTasks.length}`
            : summary.stage.key === 'in_progress' && client.status === 'Launched'
                ? 'Launched'
                : summary.stage.key === 'in_progress'
                    ? `In progress · ${summary.percent}%`
                    : summary.stage.label;
    const dot =
        summary.stage.key === 'onboarding'
            ? 'bg-violet-500'
            : summary.stage.key === 'pending_approval'
                ? 'bg-amber-500'
                : summary.stage.key === 'complete' || client.status === 'Launched'
                    ? 'bg-emerald-500'
                    : 'bg-indigo-500';
    return { label, dot, className: stageStyles[summary.stage.key] };
}

function Overview({
    username,
    entries,
    totals,
    onSelect,
}: {
    username: string;
    entries: Entry[];
    totals: { clients: number; onboarding: number; pendingApproval: number; waitingOnClient: number; onUs: number };
    onSelect: (id: string) => void;
}) {
    return (
        <div className="mx-auto max-w-6xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Hello, {username}</h1>
            <p className="mt-1 text-slate-500">Your assigned clients, and what is pending on each side. Pick a client on the left to see their tasks.</p>

            <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                    { label: 'Clients assigned', value: totals.clients, tone: 'text-slate-900' },
                    { label: 'In onboarding', value: totals.onboarding, tone: 'text-slate-900' },
                    { label: 'Pending client approval', value: totals.pendingApproval, tone: totals.pendingApproval > 0 ? 'text-amber-600' : 'text-slate-900' },
                    { label: 'Waiting on clients', value: totals.waitingOnClient, tone: totals.waitingOnClient > 0 ? 'text-amber-600' : 'text-slate-900' },
                    { label: 'Pending on our end', value: totals.onUs, tone: totals.onUs > 0 ? 'text-indigo-600' : 'text-slate-900' },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
                        <dt className="text-xs font-semibold text-slate-500">{stat.label}</dt>
                        <dd className={`mt-1 text-3xl font-bold tabular-nums ${stat.tone}`}>{stat.value}</dd>
                    </div>
                ))}
            </dl>

            {entries.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
                    <Users className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-4 text-base font-semibold text-slate-900">No clients assigned to you yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                        When a client is assigned to you from the client card in the team workspace, it shows up here.
                    </p>
                </div>
            ) : (
                <ul className="mt-6 space-y-2.5">
                    {entries.map(({ client, summary }) => {
                        const stage = stageFor(client, summary);
                        const nextDue = summary.phases.find((p) => p.status !== 'done' && p.status !== 'awaiting' && p.dueDate);
                        return (
                            <li key={client.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(client.id)}
                                    className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md lg:flex-row lg:items-center"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-base font-bold text-slate-900">{client.name}</span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stage.className}`}>{stage.label}</span>
                                            {client.funnel_type && (
                                                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{funnelLabel(client.funnel_type)}</span>
                                            )}
                                        </span>
                                        <span className="mt-0.5 block truncate text-sm text-slate-500">
                                            {client.business_name}
                                            {nextDue && (
                                                <span className={`ml-2 inline-flex items-center gap-1 ${nextDue.overdue ? 'font-semibold text-red-600' : ''}`}>
                                                    <CalendarClock className="h-3.5 w-3.5" />
                                                    {nextDue.name}: {nextDue.dueKind === 'submit' ? 'submit for approval by' : nextDue.overdue ? 'was due' : 'due'} {formatDate(nextDue.dueDate)}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-5">
                                        <span className="w-36 shrink-0">
                                            <span className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                                <span>Progress</span>
                                                <span className="tabular-nums text-slate-900">{summary.percent}%</span>
                                            </span>
                                            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${summary.percent}%` }} />
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-center">
                                            <span className={`block text-xl font-bold tabular-nums ${summary.clientPending.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{summary.clientPending.length}</span>
                                            <span className="block text-[11px] font-semibold text-slate-500">on client</span>
                                        </span>
                                        <span className="shrink-0 text-center">
                                            <span className={`block text-xl font-bold tabular-nums ${summary.teamPending.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{summary.teamPending.length}</span>
                                            <span className="block text-[11px] font-semibold text-slate-500">on us</span>
                                        </span>
                                        <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-slate-400" />
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function ClientView({ entry, pendingTaskId, onToggle }: { entry: Entry; pendingTaskId: string | null; onToggle: (task: Task, completed: boolean) => void }) {
    const { client, categories, summary } = entry;
    const stage = stageFor(client, summary);
    const journey = client.status === 'Active' ? buildJourney(summary) : null;
    const nextDue = summary.phases.find((p) => p.status !== 'done' && p.status !== 'awaiting' && p.dueDate);

    return (
        <div>
            <div className="mb-6">
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{client.name}</h1>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${stage.className}`}>{stage.label}</span>
                    {client.funnel_type && (
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{funnelLabel(client.funnel_type)}</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        {client.business_name}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Started {new Date(client.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {nextDue && (
                        <span className={`flex items-center gap-1.5 ${nextDue.overdue ? 'font-semibold text-red-600' : ''}`}>
                            <CalendarClock className="h-4 w-4" />
                            {nextDue.name}: {nextDue.dueKind === 'submit' ? 'submit by' : nextDue.overdue ? 'was due' : 'due'} {formatDate(nextDue.dueDate)}
                        </span>
                    )}
                    {client.drive_folder_url && (
                        <a href={client.drive_folder_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900">
                            <FolderOpen className="h-4 w-4 text-amber-500" />
                            Drive folder
                        </a>
                    )}
                    {client.assets_folder_url && (
                        <a href={client.assets_folder_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900">
                            <FolderOpen className="h-4 w-4 text-indigo-500" />
                            Assets folder
                        </a>
                    )}
                    <a
                        href={`/portal/${client.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-semibold text-indigo-600 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-800"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open Client Portal
                    </a>
                </div>
            </div>

            {journey && (
                <div className="mb-6">
                    <JourneyTimeline client={client} summary={summary} journey={journey} audience="team" />
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                <PendingColumn
                    title="Pending from the client"
                    icon={<Hourglass className="h-4 w-4 text-amber-600" />}
                    empty="Nothing pending from the client."
                    categories={categories}
                    match={(t) => isClientTask(t)}
                    pendingTaskId={pendingTaskId}
                    onToggle={onToggle}
                />
                <PendingColumn
                    title="Pending on our end"
                    icon={<Wrench className="h-4 w-4 text-indigo-600" />}
                    empty="Nothing pending on our end."
                    categories={categories}
                    match={(t) => !isClientTask(t)}
                    pendingTaskId={pendingTaskId}
                    onToggle={onToggle}
                />
            </div>
        </div>
    );
}

function PendingColumn({
    title,
    icon,
    empty,
    categories,
    match,
    pendingTaskId,
    onToggle,
}: {
    title: string;
    icon: React.ReactNode;
    empty: string;
    categories: PortalCategory[];
    match: (task: Task) => boolean;
    pendingTaskId: string | null;
    onToggle: (task: Task, completed: boolean) => void;
}) {
    const groups = categories
        .map((cat) => ({ cat, tasks: cat.tasks.filter(match) }))
        .filter((g) => g.tasks.length > 0);
    const pending = groups.reduce((n, g) => n + g.tasks.filter((t) => !t.completed).length, 0);
    const done = groups.reduce((n, g) => n + g.tasks.filter((t) => t.completed).length, 0);

    return (
        <section className="rounded-2xl bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                {icon}
                {title}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-700 ring-1 ring-slate-200">{pending}</span>
                {done > 0 && <span className="ml-auto text-xs font-medium text-slate-500">{done} done</span>}
            </h3>

            {pending === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
                    {empty}
                </p>
            ) : (
                <div className="mt-3 space-y-4">
                    {groups
                        .filter((g) => g.tasks.some((t) => !t.completed))
                        .map(({ cat, tasks }) => (
                            <div key={cat.id}>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{cat.name}</p>
                                <ul className="mt-1.5 space-y-1">
                                    {tasks.filter((t) => !t.completed).map((task) => {
                                        const busy = pendingTaskId === task.id;
                                        return (
                                            <li key={task.id}>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => onToggle(task, true)}
                                                    className="group flex w-full items-start gap-2.5 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-slate-200/80 transition-colors hover:ring-emerald-300 disabled:opacity-60"
                                                >
                                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-transparent transition-colors group-hover:border-emerald-500 group-hover:text-emerald-500">
                                                        {busy ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" /> : <Check className="h-3 w-3" strokeWidth={3.5} />}
                                                    </span>
                                                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800">{task.name}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                </div>
            )}
        </section>
    );
}
