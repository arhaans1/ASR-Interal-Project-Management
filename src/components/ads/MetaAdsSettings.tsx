'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, CircleAlert, CircleCheck, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { formatCount, formatMoney, ResultType, resultLabels } from '@/lib/adMetrics';

export interface MetaAdsValue {
    accountId: string; // '' when not linked
    resultType: ResultType;
    resultAction: string; // '' = the standard event
    campaignFilter: string;
}

interface Account {
    id: string;
    name: string;
    currency: string;
    timezone: string | null;
    business: string | null;
    active: boolean;
}

interface Conversion {
    id: string;
    name: string;
    action: string;
    event: string | null;
}

interface CheckResult {
    account: { name: string; currency: string };
    spend: number;
    results: number;
    lpv: number;
    campaigns: number;
}

const inputClass =
    'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

// The "Meta Ads" section of the client Edit window: which ad account feeds the client's
// Ad Performance tab, and what counts as a result.
export default function MetaAdsSettings({ value, onChange }: { value: MetaAdsValue; onChange: (value: MetaAdsValue) => void }) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [state, setState] = useState<'loading' | 'ready' | 'not_configured' | 'error'>('loading');
    const [loadError, setLoadError] = useState('');
    const [picking, setPicking] = useState(false);
    const [query, setQuery] = useState('');
    const [conversions, setConversions] = useState<Conversion[]>([]);
    const [check, setCheck] = useState<{ status: 'idle' | 'busy' | 'ok' | 'error'; result?: CheckResult; message?: string }>({ status: 'idle' });

    const set = (patch: Partial<MetaAdsValue>) => {
        onChange({ ...value, ...patch });
        setCheck({ status: 'idle' });
    };

    const loadAccounts = async (fresh = false) => {
        setState('loading');
        try {
            const res = await fetch(`/api/ads/accounts${fresh ? '?fresh=1' : ''}`, { cache: 'no-store' });
            const body = await res.json().catch(() => ({}));
            if (body.configured === false) {
                setState('not_configured');
                return;
            }
            if (!res.ok) throw new Error(body.error || 'Could not load ad accounts');
            setAccounts(body.accounts || []);
            setState('ready');
        } catch (err: any) {
            setLoadError(err.message);
            setState('error');
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    // Custom conversions for the chosen account, for "Count results from"
    useEffect(() => {
        setConversions([]);
        if (!value.accountId || state !== 'ready') return;
        let cancelled = false;
        fetch(`/api/ads/conversions?account=${encodeURIComponent(value.accountId)}`, { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : { conversions: [] }))
            .then((body) => !cancelled && setConversions(body.conversions || []))
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [value.accountId, state]);

    const selected = accounts.find((a) => a.id === value.accountId) ?? null;
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return accounts;
        return accounts.filter((a) => a.name.toLowerCase().includes(q) || a.id.includes(q) || (a.business || '').toLowerCase().includes(q));
    }, [accounts, query]);

    const runCheck = async () => {
        setCheck({ status: 'busy' });
        const params = new URLSearchParams({ account: value.accountId, type: value.resultType });
        if (value.resultAction) params.set('action', value.resultAction);
        if (value.campaignFilter.trim()) params.set('filter', value.campaignFilter.trim());
        try {
            const res = await fetch(`/api/ads/check?${params}`, { cache: 'no-store' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'The connection test failed');
            setCheck({ status: 'ok', result: body });
        } catch (err: any) {
            setCheck({ status: 'error', message: err.message });
        }
    };

    if (state === 'not_configured') {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-sm text-amber-900">
                <p className="font-semibold">Ad reporting is not switched on yet</p>
                <p className="mt-1 text-amber-900/80">
                    Add the system user token as <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">META_SYSTEM_USER_TOKEN</code> in the hosting environment, then redeploy.
                </p>
            </div>
        );
    }

    const labels = resultLabels(value.resultType);

    return (
        <div className="space-y-4">
            {/* Ad account */}
            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className={labelClass + ' mb-0'}>Ad account</span>
                    <button
                        type="button"
                        onClick={() => loadAccounts(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                        title="Load the list again from Meta, e.g. after assigning a new account to the system user"
                    >
                        <RefreshCw className={`h-3 w-3 ${state === 'loading' ? 'animate-spin' : ''}`} />
                        Refresh list
                    </button>
                </div>

                {state === 'error' && (
                    <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                        {loadError}
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => setPicking((p) => !p)}
                    aria-expanded={picking}
                    className={`${inputClass} flex items-center justify-between gap-3 text-left`}
                >
                    {value.accountId ? (
                        <span className="min-w-0">
                            <span className="block truncate font-semibold">{selected?.name ?? value.accountId}</span>
                            <span className="block truncate text-xs text-slate-500">
                                {value.accountId}
                                {selected?.business ? ` · ${selected.business}` : ''}
                                {selected ? ` · ${selected.currency}` : ''}
                            </span>
                        </span>
                    ) : (
                        <span className="text-slate-400">{state === 'loading' ? 'Loading ad accounts…' : 'Not linked: choose an ad account'}</span>
                    )}
                    {state === 'loading' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" /> : <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${picking ? 'rotate-180' : ''}`} />}
                </button>

                {value.accountId && state === 'ready' && !selected && (
                    <p className="mt-1.5 text-xs font-medium text-amber-700">
                        The system user can&rsquo;t see this account. Assign it in Business Settings › System users, then refresh the list.
                    </p>
                )}

                {picking && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="relative border-b border-slate-100">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, business or ID"
                                className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
                                autoFocus
                            />
                        </div>
                        <ul className="max-h-60 overflow-y-auto py-1" role="listbox" aria-label="Ad accounts">
                            {value.accountId && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            set({ accountId: '', resultAction: '' });
                                            setPicking(false);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                        Unlink the ad account
                                    </button>
                                </li>
                            )}
                            {filtered.map((a) => (
                                <li key={a.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={a.id === value.accountId}
                                        onClick={() => {
                                            set({ accountId: a.id, resultAction: a.id === value.accountId ? value.resultAction : '' });
                                            setPicking(false);
                                            setQuery('');
                                        }}
                                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-slate-900">{a.name}</span>
                                            <span className="block truncate text-xs text-slate-500">
                                                {a.id}
                                                {a.business ? ` · ${a.business}` : ''} · {a.currency}
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2">
                                            {!a.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Inactive</span>}
                                            {a.id === value.accountId && <Check className="h-4 w-4 text-indigo-600" />}
                                        </span>
                                    </button>
                                </li>
                            ))}
                            {state === 'ready' && filtered.length === 0 && (
                                <li className="px-3 py-4 text-center text-xs text-slate-500">
                                    {accounts.length === 0
                                        ? 'No ad accounts are assigned to the system user yet.'
                                        : 'No account matches. New accounts appear once they are assigned to the system user.'}
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>

            {value.accountId && (
                <>
                    {/* What counts as a result */}
                    <div>
                        <span className={labelClass}>Results are</span>
                        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Results are">
                            {([
                                { id: 'purchase', label: 'Sales', note: 'Purchases' },
                                { id: 'schedule', label: 'Appointments', note: 'Calls booked' },
                            ] as const).map((o) => {
                                const active = value.resultType === o.id;
                                return (
                                    <button
                                        key={o.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => set({ resultType: o.id, resultAction: '' })}
                                        className={`rounded-lg py-2 text-sm font-semibold transition-all ${active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        {o.label}
                                        <span className="ml-1.5 text-xs font-medium text-slate-400">{o.note}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="meta-result-action" className={labelClass}>Count {labels.plural.toLowerCase()} from</label>
                        <div className="relative">
                            <select
                                id="meta-result-action"
                                value={value.resultAction}
                                onChange={(e) => set({ resultAction: e.target.value })}
                                className={`${inputClass} cursor-pointer appearance-none pr-10`}
                            >
                                <option value="">Standard {value.resultType === 'schedule' ? 'Schedule' : 'Purchase'} event (recommended)</option>
                                {conversions.length > 0 && (
                                    <optgroup label="Custom conversions">
                                        {conversions.map((c) => (
                                            <option key={c.id} value={c.action}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {value.resultAction && !conversions.some((c) => c.action === value.resultAction) && (
                                    <option value={value.resultAction}>{value.resultAction}</option>
                                )}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="meta-campaign-filter" className={labelClass}>
                            Only campaigns whose name contains <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <input
                            id="meta-campaign-filter"
                            type="text"
                            value={value.campaignFilter}
                            onChange={(e) => set({ campaignFilter: e.target.value })}
                            placeholder="Leave blank if this account is only for this client"
                            className={inputClass}
                        />
                    </div>

                    {/* Test connection */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-medium text-slate-600">Check these settings against the last 7 days in Meta.</p>
                            <button
                                type="button"
                                onClick={runCheck}
                                disabled={check.status === 'busy'}
                                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:ring-slate-300 disabled:opacity-60"
                            >
                                {check.status === 'busy' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />}
                                Test connection
                            </button>
                        </div>
                        {check.status === 'ok' && check.result && (
                            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                                Connected to <span className="font-semibold">{check.result.account.name}</span>. Last 7 days:{' '}
                                {formatMoney(check.result.spend, check.result.account.currency)} spent · {formatCount(check.result.results)} {labels.plural.toLowerCase()} ·{' '}
                                {formatCount(check.result.lpv)} landing page views · {check.result.campaigns} {check.result.campaigns === 1 ? 'campaign' : 'campaigns'} with spend.
                            </p>
                        )}
                        {check.status === 'error' && (
                            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                                {check.message}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
