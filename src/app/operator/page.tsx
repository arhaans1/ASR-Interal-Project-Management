'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, FolderOpen, Hourglass, Loader2, LogOut, Users, Wrench } from 'lucide-react';
import { PortalCategory, PortalClient, Task } from '@/types/database';
import { funnelLabel } from '@/lib/funnelTemplates';
import { isClientTask, summarizeProject } from '@/lib/progress';

interface ClientEntry {
    client: PortalClient;
    categories: PortalCategory[];
}

interface WorkspaceData {
    viewer: { role: 'admin' | 'operator'; userId: string; username: string };
    operators: { id: string; username: string }[];
    clients: ClientEntry[];
}

const UNASSIGNED = '__unassigned__';

export default function OperatorWorkspacePage() {
    const router = useRouter();
    const [data, setData] = useState<WorkspaceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openClientId, setOpenClientId] = useState<string | null>(null);
    const [operatorFilter, setOperatorFilter] = useState<string>('all');
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

    const isAdmin = data?.viewer.role === 'admin';

    const entries = useMemo(() => {
        const all = (data?.clients ?? []).map((entry) => ({ ...entry, summary: summarizeProject(entry.categories) }));
        if (!isAdmin || operatorFilter === 'all') return all;
        if (operatorFilter === UNASSIGNED) return all.filter((e) => !e.client.operator_id);
        return all.filter((e) => e.client.operator_id === operatorFilter);
    }, [data, isAdmin, operatorFilter]);

    const totals = useMemo(
        () => ({
            clients: entries.length,
            onboarding: entries.filter((e) => e.summary.hasOnboarding && !e.summary.onboardingComplete).length,
            waitingOnClient: entries.reduce((n, e) => n + e.summary.clientPending.length, 0),
            onUs: entries.reduce((n, e) => n + e.summary.teamPending.length, 0),
        }),
        [entries]
    );

    const operatorName = (id: string | null) => data?.operators.find((o) => o.id === id)?.username ?? null;

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

    const filters = [
        { id: 'all', label: 'All operators' },
        ...data.operators.map((o) => ({ id: o.id, label: o.username })),
        { id: UNASSIGNED, label: 'Unassigned' },
    ];

    return (
        <div className="h-screen overflow-y-auto bg-[#F5F6FA]">
            <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white shadow-sm">A</div>
                        <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-bold tracking-tight text-slate-900">ASR Media Pro</p>
                            <p className="truncate text-xs font-medium text-slate-500">
                                {isAdmin ? 'Operators overview' : 'Operator workspace'}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {isAdmin && (
                            <button
                                onClick={() => router.push('/')}
                                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Team workspace</span>
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        {isAdmin ? 'Client projects by operator' : `Hello, ${data.viewer.username}`}
                    </h1>
                    <p className="text-slate-500">
                        {isAdmin
                            ? 'Who is running each project, and what is pending on each side.'
                            : 'Your assigned clients, and what is pending on each side.'}
                    </p>
                </div>

                {/* Totals */}
                <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { label: isAdmin ? 'Client projects' : 'Clients assigned', value: totals.clients, tone: 'text-slate-900' },
                        { label: 'In onboarding', value: totals.onboarding, tone: 'text-slate-900' },
                        { label: 'Waiting on clients', value: totals.waitingOnClient, tone: totals.waitingOnClient > 0 ? 'text-amber-600' : 'text-slate-900' },
                        { label: 'Pending on our end', value: totals.onUs, tone: totals.onUs > 0 ? 'text-indigo-600' : 'text-slate-900' },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
                            <dt className="text-xs font-semibold text-slate-500">{stat.label}</dt>
                            <dd className={`mt-1 text-3xl font-bold tabular-nums ${stat.tone}`}>{stat.value}</dd>
                        </div>
                    ))}
                </dl>

                {isAdmin && (
                    <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by operator">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setOperatorFilter(f.id)}
                                aria-pressed={operatorFilter === f.id}
                                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${operatorFilter === f.id
                                    ? 'bg-slate-900 text-white'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}

                {notice && (
                    <div role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                        {notice}
                    </div>
                )}

                {/* Clients */}
                {entries.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
                        <Users className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-4 text-base font-semibold text-slate-900">
                            {isAdmin ? 'No client projects here' : 'No clients assigned to you yet'}
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                            {isAdmin
                                ? 'Assign an operator from the client card in the team workspace.'
                                : 'When a client is assigned to you from the team workspace, it shows up here.'}
                        </p>
                    </div>
                ) : (
                    <ul className="mt-6 space-y-3">
                        {entries.map(({ client, categories, summary }) => {
                            const open = openClientId === client.id;
                            const inOnboarding = summary.hasOnboarding && !summary.onboardingComplete;
                            const stage = summary.total === 0
                                ? { label: 'No tasks yet', className: 'bg-slate-100 text-slate-600' }
                                : inOnboarding
                                    ? { label: `Onboarding · ${summary.onboardingDone}/${summary.onboardingTasks.length}`, className: 'bg-amber-100 text-amber-800' }
                                    : client.status === 'Launched'
                                        ? { label: 'Launched', className: 'bg-emerald-100 text-emerald-800' }
                                        : summary.done === summary.total
                                            ? { label: 'All tasks done', className: 'bg-emerald-100 text-emerald-800' }
                                            : { label: 'In delivery', className: 'bg-indigo-100 text-indigo-800' };
                            const assigned = operatorName(client.operator_id);

                            return (
                                <li key={client.id} className={`rounded-2xl border bg-white transition-shadow ${open ? 'border-slate-300 shadow-lg shadow-slate-950/5' : 'border-slate-200/80 shadow-sm'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenClientId(open ? null : client.id)}
                                        aria-expanded={open}
                                        className="flex w-full flex-col gap-4 px-5 py-4 text-left lg:flex-row lg:items-center"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-base font-bold text-slate-900">{client.name}</span>
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stage.className}`}>{stage.label}</span>
                                                {client.funnel_type && (
                                                    <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                                        {funnelLabel(client.funnel_type)}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="mt-0.5 block truncate text-sm text-slate-500">
                                                {client.business_name}
                                                {isAdmin && <> · {assigned ? `Operator: ${assigned}` : 'No operator assigned'}</>}
                                            </span>
                                        </span>

                                        <span className="flex items-center gap-5">
                                            <span className="w-36 shrink-0">
                                                <span className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                                    <span>Progress</span>
                                                    <span className="tabular-nums text-slate-900">{summary.percent}%</span>
                                                </span>
                                                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                    <span className="block h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${summary.percent}%` }} />
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
                                            <ChevronDown className={`ml-auto h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                                        </span>
                                    </button>

                                    {open && (
                                        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                                            <div className="grid gap-5 lg:grid-cols-2">
                                                <PendingColumn
                                                    title="Pending from the client"
                                                    icon={<Hourglass className="h-4 w-4 text-amber-600" />}
                                                    empty="Nothing pending from the client."
                                                    categories={categories}
                                                    match={(t) => isClientTask(t)}
                                                    pendingTaskId={pendingTaskId}
                                                    onToggle={(task, completed) => handleToggle(client.id, task, completed)}
                                                />
                                                <PendingColumn
                                                    title="Pending on our end"
                                                    icon={<Wrench className="h-4 w-4 text-indigo-600" />}
                                                    empty="Nothing pending on our end."
                                                    categories={categories}
                                                    match={(t) => !isClientTask(t)}
                                                    pendingTaskId={pendingTaskId}
                                                    onToggle={(task, completed) => handleToggle(client.id, task, completed)}
                                                />
                                            </div>

                                            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                                <a
                                                    href={`/portal/${client.id}`}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                                >
                                                    View client portal
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </a>
                                                {client.drive_folder_url && (
                                                    <a
                                                        href={client.drive_folder_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                                    >
                                                        <FolderOpen className="h-4 w-4 text-amber-500" />
                                                        Drive folder
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>
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
