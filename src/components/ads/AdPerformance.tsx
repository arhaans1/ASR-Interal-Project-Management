'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Link2, Loader2, Megaphone, Minus, RefreshCw, Rocket, TriangleAlert } from 'lucide-react';
import {
    AdMetrics,
    AdsErrorCode,
    AdsReport,
    change,
    DateSelection,
    formatCount,
    formatMoney,
    formatPercent,
    MetricDef,
    MetricKey,
    metricDefs,
    presetLabel,
    presetRange,
    rangeLength,
    resultLabels,
} from '@/lib/adMetrics';
import DateRangePicker from './DateRangePicker';
import TrendChart from './TrendChart';
import Card from './Card';
import { CampaignTable, TopAds } from './AdsDetail';

interface AdPerformanceProps {
    clientId: string;
    audience: 'team' | 'client';
    // Team only: opens the client's Edit window to link an ad account
    onLinkAccount?: () => void;
}

const rangeKey = (audience: string) => `asr_ads_range_${audience}`;

function initialSelection(audience: string): DateSelection {
    try {
        const saved = localStorage.getItem(rangeKey(audience));
        if (saved) {
            const parsed = JSON.parse(saved) as DateSelection;
            // Presets are worked out again for today; a custom range is kept as it was.
            if (parsed.preset && parsed.preset !== 'custom') return presetRange(parsed.preset);
            if (parsed.since && parsed.until) return parsed;
        }
    } catch { }
    return presetRange('last_7d');
}

export default function AdPerformance({ clientId, audience, onLinkAccount }: AdPerformanceProps) {
    const [selection, setSelection] = useState<DateSelection>(() => presetRange('last_7d'));
    const [ready, setReady] = useState(false);
    const [report, setReport] = useState<AdsReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<{ message: string; code: AdsErrorCode | null } | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const [, setTick] = useState(0);

    // The last range picked on this device
    useEffect(() => {
        setSelection(initialSelection(audience));
        setReady(true);
    }, [audience]);

    const load = useCallback(
        async (fresh = false) => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            if (fresh) setRefreshing(true);
            else setLoading(true);

            const params = new URLSearchParams({ preset: selection.preset });
            if (selection.preset !== 'maximum') {
                params.set('since', selection.since);
                params.set('until', selection.until);
            }
            if (fresh) params.set('fresh', '1');
            // The team's portal preview asks for exactly what the client sees.
            if (audience === 'client') params.set('as', 'client');

            try {
                const res = await fetch(`/api/portal/${clientId}/ads?${params}`, { cache: 'no-store', signal: controller.signal });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setError({ message: body.error || 'Could not load ad performance.', code: body.code ?? null });
                    if (body.code === 'not_linked' || body.code === 'not_configured') setReport(null);
                } else {
                    setReport(body as AdsReport);
                    setError(null);
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                setError({ message: 'Could not reach the server. Check your connection and try again.', code: null });
            } finally {
                if (abortRef.current === controller) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [clientId, selection, audience]
    );

    useEffect(() => {
        if (ready) load();
        return () => abortRef.current?.abort();
    }, [ready, load]);

    // Keeps "Updated 3 min ago" current
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const changeSelection = (next: DateSelection) => {
        setSelection(next);
        try {
            localStorage.setItem(rangeKey(audience), JSON.stringify(next));
        } catch { }
    };

    const isTeam = audience === 'team';

    if (error && (error.code === 'not_linked' || error.code === 'not_configured') && !report) {
        return <NotReady code={error.code} isTeam={isTeam} message={error.message} onLinkAccount={onLinkAccount} />;
    }

    const resolved = report ? { since: report.range.since, until: report.range.until } : null;
    const showSkeleton = loading && !report;

    return (
        <div className="space-y-6">
            <Hero
                report={report}
                isTeam={isTeam}
                selection={selection}
                resolved={resolved}
                onChange={changeSelection}
                onRefresh={() => load(true)}
                busy={loading || refreshing}
            />

            {error && report && (
                <div role="alert" className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{error.message} Showing the last figures that loaded.</span>
                </div>
            )}

            {error && !report && !loading && (
                <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                        <TriangleAlert className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-base font-bold text-slate-900">Ad performance could not be loaded</p>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
                        {isTeam ? error.message : 'Please try again in a few minutes. If it keeps happening, let your project manager know.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => load()}
                        className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        Try again
                    </button>
                </div>
            )}

            {showSkeleton && <Skeleton isTeam={isTeam} />}

            {report && <ReportBody report={report} isTeam={isTeam} dimmed={loading} />}
        </div>
    );
}

// ---------------------------------------------------------------- hero

function Hero({
    report,
    isTeam,
    selection,
    resolved,
    onChange,
    onRefresh,
    busy,
}: {
    report: AdsReport | null;
    isTeam: boolean;
    selection: DateSelection;
    resolved: { since: string; until: string } | null;
    onChange: (s: DateSelection) => void;
    onRefresh: () => void;
    busy: boolean;
}) {
    const type = report?.resultType ?? 'purchase';
    const defs = metricDefs(type);
    const showRoas = report ? report.showRoas : type === 'purchase';
    const primary: MetricKey[] = showRoas ? ['spend', 'results', 'costPerResult', 'roas'] : ['spend', 'results', 'costPerResult', 'lpv'];
    // e.g. "28 Purchases · 13 Webinar sale", when results are made of more than one kind
    const breakdown =
        report && (report.breakdown.length > 1 || (type === 'auto' && report.breakdown.length === 1))
            ? report.breakdown.slice(0, 3).map((b) => `${formatCount(b.count)} ${b.label}`).join(' · ') + (report.breakdown.length > 3 ? ' · …' : '')
            : null;
    const scopeNote = type === 'auto' ? 'Results as in Ads Manager' : type === 'schedule' ? 'Appointment campaigns' : 'Sales campaigns';
    const currency = report?.account.currency ?? 'INR';
    const compareLabel = report?.previousRange
        ? selection.preset === 'today'
            ? 'vs yesterday'
            : `vs previous ${rangeLength(report.range.since, report.range.until)} days`
        : null;

    return (
        <section className="relative rounded-[28px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-8 sm:py-7">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-indigo-600/40 blur-3xl" />
                <div className="absolute -bottom-40 left-1/4 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
            </div>

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
                        <BarChart3 className="h-3.5 w-3.5" />
                        {isTeam ? 'Ad performance' : 'Your ad results'}
                    </p>
                    <h2 className="mt-2 truncate text-xl font-bold tracking-tight sm:text-2xl">
                        {report ? report.account.name : 'Loading…'}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                        {report ? (
                            <>
                                {isTeam && report.campaignFilter && <>Campaigns containing &ldquo;{report.campaignFilter}&rdquo; · </>}
                                {scopeNote} · Updated {timeAgo(report.updatedAt)}
                            </>
                        ) : (
                            'Fetching the latest numbers from Meta'
                        )}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <DateRangePicker value={selection} resolved={resolved} onChange={onChange} tone="dark" />
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={busy}
                        aria-label="Refresh from Meta"
                        title="Refresh from Meta"
                        className="rounded-xl bg-white/10 p-2.5 text-slate-200 ring-1 ring-white/15 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <dl className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {primary.map((key) => {
                    const def = defs[key];
                    const value = report ? report.totals[key as keyof AdMetrics] as number | null : null;
                    const prev = report?.previous ? (report.previous[key as keyof AdMetrics] as number | null) : null;
                    return (
                        <div key={key} className="min-w-0 rounded-2xl bg-white/[0.06] px-3.5 py-3.5 ring-1 ring-white/10 sm:px-4 sm:py-4" title={def.hint}>
                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{def.label}</dt>
                            <dd className="mt-1.5 truncate text-xl font-bold tabular-nums sm:text-2xl xl:text-[28px]">
                                {report ? def.format(value, currency) : <span className="inline-block h-7 w-24 animate-pulse rounded-lg bg-white/10" />}
                            </dd>
                            <div className="mt-2 flex min-h-[20px] flex-wrap items-center gap-x-2 gap-y-1">
                                {report && compareLabel && <Delta value={change(value, prev)} lowerIsBetter={def.lowerIsBetter} tone="dark" title={compareLabel} />}
                                {report && key === 'roas' && report.totals.revenue > 0 && (
                                    <span className="text-xs font-medium text-slate-400">{formatMoney(report.totals.revenue, currency)} revenue</span>
                                )}
                            </div>
                            {key === 'results' && breakdown && (
                                <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-snug text-slate-400" title={report?.breakdown.map((b) => `${b.count} ${b.label}`).join(', ')}>
                                    {breakdown}
                                </p>
                            )}
                        </div>
                    );
                })}
            </dl>
            {report && compareLabel && <p className="relative mt-3 text-[11px] font-medium text-slate-500">Changes are {compareLabel}.</p>}
        </section>
    );
}

// ---------------------------------------------------------------- body

function ReportBody({ report, isTeam, dimmed }: { report: AdsReport; isTeam: boolean; dimmed: boolean }) {
    const type = report.resultType;
    const defs = metricDefs(type);
    const currency = report.account.currency;
    const noDelivery = report.totals.spend === 0 && report.totals.impressions === 0;

    // Landing page views sit in the headline when there is no ROAS to show.
    const showRoas = report.showRoas;
    const secondary: MetricKey[] = useMemo(() => {
        const keys: MetricKey[] = [];
        if (showRoas) keys.push('lpv');
        keys.push('costPerLpv', 'uniqueOutboundCtr');
        if (isTeam) keys.push('cpm');
        if (!showRoas) keys.push('outboundClicks');
        return keys;
    }, [showRoas, isTeam]);

    const cols = secondary.length === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3';

    return (
        <div className={`space-y-6 transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
            {noDelivery ? (
                <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <Megaphone className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-base font-bold text-slate-900">No ad delivery in this period</p>
                    <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                        No ads ran between these dates. Try a longer range{report.range.preset === 'maximum' ? '' : ', or Lifetime'}.
                    </p>
                </div>
            ) : (
                <>
                    <div className={`grid grid-cols-1 gap-4 ${cols}`}>
                        {secondary.map((key) => (
                            <MetricTile key={key} def={defs[key]} report={report} />
                        ))}
                    </div>

                    <div className={`grid grid-cols-1 gap-6 ${isTeam ? '2xl:grid-cols-[minmax(0,1fr)_340px]' : 'lg:grid-cols-[minmax(0,1fr)_340px]'}`}>
                        <Card
                            title={report.granularity === 'week' ? 'Week by week' : 'Day by day'}
                            subtitle={`Amount spent and ${resultLabels(type).plural.toLowerCase()} for ${presetLabel(report.range.preset).toLowerCase()}`}
                        >
                            <TrendChart daily={report.daily} resultType={type} currency={currency} weekly={report.granularity === 'week'} />
                        </Card>
                        <Card title="Funnel" subtitle="From impression to result">
                            <Funnel totals={report.totals} type={type} sideBreakpoint={isTeam ? '2xl' : 'lg'} />
                        </Card>
                    </div>

                    {isTeam && report.ads && <TopAds ads={report.ads} resultType={type} showRoas={showRoas} currency={currency} />}
                    {isTeam && report.campaigns && <CampaignTable campaigns={report.campaigns} resultType={type} showRoas={showRoas} currency={currency} />}
                </>
            )}
        </div>
    );
}

function MetricTile({ def, report }: { def: MetricDef; report: AdsReport }) {
    const value = report.totals[def.key as keyof AdMetrics] as number | null;
    const prev = report.previous ? (report.previous[def.key as keyof AdMetrics] as number | null) : null;
    const series = report.daily.map(def.daily);
    return (
        <div className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition-shadow hover:shadow-md" title={def.hint}>
            <p className="text-xs font-semibold text-slate-500">{def.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
                <p className="truncate text-[26px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">{def.format(value, report.account.currency)}</p>
                <Sparkline values={series} />
            </div>
            <div className="mt-3 h-5">{report.previous && <Delta value={change(value, prev)} lowerIsBetter={def.lowerIsBetter} />}</div>
        </div>
    );
}

function Sparkline({ values }: { values: (number | null)[] }) {
    const points = values.map((v, i) => ({ i, v })).filter((p): p is { i: number; v: number } => p.v !== null && Number.isFinite(p.v));
    if (points.length < 2) return <span className="h-8 w-24" />;
    const w = 96;
    const h = 32;
    const min = Math.min(...points.map((p) => p.v));
    const max = Math.max(...points.map((p) => p.v));
    const span = max - min || 1;
    const x = (i: number) => (i / Math.max(1, values.length - 1)) * w;
    const y = (v: number) => h - 3 - ((v - min) / span) * (h - 6);
    const d = points.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const last = points[points.length - 1];
    return (
        <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
            <path d={d} fill="none" stroke="#818cf8" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(last.i)} cy={y(last.v)} r={2.5} fill="#4f46e5" />
        </svg>
    );
}

function Delta({ value, lowerIsBetter, tone = 'light', title }: { value: number | null; lowerIsBetter?: boolean; tone?: 'light' | 'dark'; title?: string }) {
    if (value === null) {
        return <span className={`text-xs font-medium ${tone === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>No earlier data</span>;
    }
    const flat = Math.abs(value) < 0.5;
    const good = flat ? null : lowerIsBetter ? value < 0 : value > 0;
    const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
    const styles =
        tone === 'dark'
            ? good === null
                ? 'bg-white/10 text-slate-300'
                : good
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : 'bg-rose-400/15 text-rose-300'
            : good === null
                ? 'bg-slate-100 text-slate-600'
                : good
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700';
    return (
        <span title={title} className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${styles}`}>
            <Icon className="h-3.5 w-3.5" />
            {Math.abs(value) >= 1000 ? '999+' : Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}%
        </span>
    );
}

// Side by side with the chart it stacks; on its own row it runs across in four steps.
function Funnel({ totals, type, sideBreakpoint }: { totals: AdMetrics; type: AdsReport['resultType']; sideBreakpoint: 'lg' | '2xl' }) {
    const labels = resultLabels(type);
    const steps = [
        { label: 'Impressions', value: totals.impressions, color: 'bg-indigo-500', rate: null as null | { value: number | null; label: string } },
        {
            label: 'Outbound clicks',
            value: totals.outboundClicks,
            color: 'bg-violet-500',
            rate: { value: totals.impressions > 0 ? (totals.outboundClicks / totals.impressions) * 100 : null, label: 'clicked through' },
        },
        {
            label: 'Landing page views',
            value: totals.lpv,
            color: 'bg-sky-500',
            rate: { value: totals.outboundClicks > 0 ? (totals.lpv / totals.outboundClicks) * 100 : null, label: 'reached the page' },
        },
        {
            label: labels.plural,
            value: totals.results,
            color: 'bg-emerald-500',
            rate: { value: totals.lpv > 0 ? (totals.results / totals.lpv) * 100 : null, label: type === 'schedule' ? 'of visitors booked' : type === 'auto' ? 'of visitors converted' : 'of visitors bought' },
        },
    ];
    // A log scale keeps the small steps visible next to impressions.
    const top = Math.log10(Math.max(10, totals.impressions) + 1);
    const width = (v: number) => (v <= 0 ? 0 : Math.max(6, (Math.log10(v + 1) / top) * 100));
    const layout = sideBreakpoint === 'lg' ? 'sm:grid-cols-2 lg:grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-1';

    return (
        <ol className={`grid grid-cols-1 gap-3 ${layout}`}>
            {steps.map((step, i) => (
                <li key={step.label} className="relative flex flex-col rounded-2xl bg-slate-50 px-4 py-3.5">
                    <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                            {i + 1}
                        </span>
                        <span className="truncate text-xs font-semibold text-slate-500">{step.label}</span>
                    </div>
                    <span className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">{formatCount(step.value)}</span>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                        <div className={`h-full rounded-full ${step.color} transition-all duration-700`} style={{ width: `${width(step.value)}%` }} />
                    </div>
                    <p className="mt-2 min-h-[16px] text-[11px] font-semibold text-slate-500">
                        {step.rate ? (
                            <>
                                <span className="tabular-nums text-slate-800">{formatPercent(step.rate.value)}</span> {step.rate.label}
                            </>
                        ) : (
                            'Times your ads were shown'
                        )}
                    </p>
                </li>
            ))}
        </ol>
    );
}

// ---------------------------------------------------------------- states

function Skeleton({ isTeam }: { isTeam: boolean }) {
    return (
        <div className="space-y-6" aria-hidden>
            <div className={`grid grid-cols-1 gap-4 ${isTeam ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
                {Array.from({ length: isTeam ? 4 : 3 }).map((_, i) => (
                    <div key={i} className="h-[124px] animate-pulse rounded-3xl bg-white ring-1 ring-slate-200/80" />
                ))}
            </div>
            <div className="h-[340px] animate-pulse rounded-3xl bg-white ring-1 ring-slate-200/80" />
        </div>
    );
}

function NotReady({
    code,
    isTeam,
    message,
    onLinkAccount,
}: {
    code: AdsErrorCode;
    isTeam: boolean;
    message: string;
    onLinkAccount?: () => void;
}) {
    if (!isTeam) {
        return (
            <div className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-14 text-center text-white shadow-xl sm:px-10">
                <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-indigo-600/40 blur-3xl" />
                <div className="relative mx-auto max-w-md">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                        <Rocket className="h-7 w-7 text-indigo-300" />
                    </div>
                    <h2 className="mt-5 text-2xl font-bold tracking-tight">Your ad results will show here</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        Once your ads go live, you&rsquo;ll see what you&rsquo;ve spent, your results and what each one costs, updated through the day.
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200/80">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                {code === 'not_linked' ? <Link2 className="h-7 w-7" /> : <Loader2 className="h-7 w-7" />}
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">
                {code === 'not_linked' ? 'Link this client’s Meta ad account' : 'Ad reporting is not set up yet'}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                {code === 'not_linked'
                    ? 'Pick the ad account in the client’s Edit window, under Meta Ads. The client sees their results in the portal once it’s linked.'
                    : message}
            </p>
            {code === 'not_linked' && onLinkAccount && (
                <button
                    type="button"
                    onClick={onLinkAccount}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                    <Link2 className="h-4 w-4" />
                    Link ad account
                </button>
            )}
        </div>
    );
}

function timeAgo(iso: string) {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}
