'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, startOfWeek } from 'date-fns';
import { DailyPoint, formatCount, formatMoney, ResultType, resultLabels, toISODate } from '@/lib/adMetrics';

interface TrendChartProps {
    daily: DailyPoint[];
    resultType: ResultType;
    currency: string;
    weekly?: boolean; // points are already weeks (long ranges)
}

type LineKey = 'results' | 'lpv';

interface Bucket {
    label: string;
    tick: string;
    spend: number;
    results: number;
    lpv: number;
}

const HEIGHT = 260;
const PAD = { top: 16, right: 44, bottom: 30, left: 60 };

// A tidy axis maximum: 1, 2, 2.5 or 5 times a power of ten.
function niceMax(value: number) {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const n = value / power;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * power;
}

export default function TrendChart({ daily, resultType, currency, weekly = false }: TrendChartProps) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [hover, setHover] = useState<number | null>(null);
    const [line, setLine] = useState<LineKey>('results');
    const labels = resultLabels(resultType);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Long ranges are shown week by week so the bars stay readable.
    const buckets: Bucket[] = useMemo(() => {
        if (weekly) {
            return daily.map((d) => {
                const date = parseISO(d.date);
                return { label: `Week from ${format(date, 'd MMM yyyy')}`, tick: format(date, 'd MMM yy'), spend: d.spend, results: d.results, lpv: d.lpv };
            });
        }
        if (daily.length <= 92) {
            return daily.map((d) => {
                const date = parseISO(d.date);
                return { label: format(date, 'EEE, d MMM yyyy'), tick: format(date, 'd MMM'), spend: d.spend, results: d.results, lpv: d.lpv };
            });
        }
        const weeks = new Map<string, Bucket>();
        for (const d of daily) {
            const week = startOfWeek(parseISO(d.date), { weekStartsOn: 1 });
            const key = toISODate(week);
            const b = weeks.get(key) ?? { label: `Week of ${format(week, 'd MMM yyyy')}`, tick: format(week, 'd MMM yy'), spend: 0, results: 0, lpv: 0 };
            b.spend += d.spend;
            b.results += d.results;
            b.lpv += d.lpv;
            weeks.set(key, b);
        }
        return [...weeks.values()];
    }, [daily, weekly]);

    const innerW = Math.max(0, width - PAD.left - PAD.right);
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const n = buckets.length;
    const slot = n > 0 ? innerW / n : 0;
    const barW = Math.max(2, Math.min(28, slot * 0.62));

    const maxSpend = niceMax(Math.max(0, ...buckets.map((b) => b.spend)));
    const maxLine = niceMax(Math.max(0, ...buckets.map((b) => b[line])));
    const x = (i: number) => PAD.left + slot * i + slot / 2;
    const ySpend = (v: number) => PAD.top + innerH - (v / maxSpend) * innerH;
    const yLine = (v: number) => PAD.top + innerH - (v / maxLine) * innerH;

    const linePath = buckets.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yLine(b[line]).toFixed(1)}`).join(' ');
    const areaPath = n > 0 ? `${linePath} L${x(n - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z` : '';
    const tickEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 72))));
    const grid = [0, 0.25, 0.5, 0.75, 1];

    const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (n === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const i = Math.floor((e.clientX - rect.left - PAD.left) / slot);
        setHover(i >= 0 && i < n ? i : null);
    };

    const hovered = hover !== null ? buckets[hover] : null;
    const lineLabel = line === 'results' ? labels.plural : 'Landing page views';
    const total = (key: 'spend' | LineKey) => buckets.reduce((sum, b) => sum + b[key], 0);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                        Amount spent
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded-full bg-emerald-500" />
                        {lineLabel}
                    </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Line shows">
                    {(['results', 'lpv'] as LineKey[]).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setLine(key)}
                            aria-pressed={line === key}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${line === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {key === 'results' ? labels.plural : 'Landing page views'}
                        </button>
                    ))}
                </div>
            </div>

            <div ref={wrapRef} className="relative w-full" style={{ height: HEIGHT }}>
                {width > 0 && (
                    <svg
                        width={width}
                        height={HEIGHT}
                        className="block select-none"
                        onMouseMove={onMove}
                        onMouseLeave={() => setHover(null)}
                        role="img"
                        aria-label={`Amount spent and ${lineLabel.toLowerCase()} over time. Total spent ${formatMoney(total('spend'), currency)}, ${formatCount(total(line))} ${lineLabel.toLowerCase()}.`}
                    >
                        <defs>
                            <linearGradient id="trend-area" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {grid.map((g) => {
                            const y = PAD.top + innerH - g * innerH;
                            return (
                                <g key={g}>
                                    <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={g === 0 ? undefined : '3 4'} />
                                    <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-medium tabular-nums">
                                        {formatMoney(maxSpend * g, currency, { compact: true }).replace(/\.00$/, '')}
                                    </text>
                                    <text x={width - PAD.right + 10} y={y + 4} textAnchor="start" className="fill-emerald-600/70 text-[11px] font-medium tabular-nums">
                                        {formatCount(maxLine * g >= 10 ? Math.round(maxLine * g) : Number((maxLine * g).toFixed(1)), { compact: true })}
                                    </text>
                                </g>
                            );
                        })}

                        {buckets.map((b, i) => {
                            const y = ySpend(b.spend);
                            return (
                                <rect
                                    key={i}
                                    x={x(i) - barW / 2}
                                    y={y}
                                    width={barW}
                                    height={Math.max(0, PAD.top + innerH - y)}
                                    rx={Math.min(4, barW / 3)}
                                    className={`transition-colors ${hover === null || hover === i ? 'fill-indigo-500' : 'fill-indigo-200'}`}
                                />
                            );
                        })}

                        {n > 1 && <path d={areaPath} fill="url(#trend-area)" />}
                        {n > 1 && <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />}
                        {buckets.map((b, i) =>
                            n <= 45 || hover === i ? (
                                <circle key={i} cx={x(i)} cy={yLine(b[line])} r={hover === i ? 5 : 3} fill="#fff" stroke="#10b981" strokeWidth={2} />
                            ) : null
                        )}

                        {buckets.map((b, i) =>
                            i % tickEvery === 0 ? (
                                <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-400 text-[11px] font-medium">
                                    {b.tick}
                                </text>
                            ) : null
                        )}

                        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#94a3b8" strokeDasharray="2 3" />}
                    </svg>
                )}

                {hovered && hover !== null && (
                    <div
                        className="pointer-events-none absolute top-2 z-10 min-w-[180px] rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs text-white shadow-xl"
                        style={{
                            left: Math.min(Math.max(x(hover) + 12, 0), Math.max(0, width - 200)),
                        }}
                    >
                        <p className="mb-1.5 font-semibold text-slate-300">{hovered.label}</p>
                        <p className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-indigo-400" />Spent</span>
                            <span className="font-bold tabular-nums">{formatMoney(hovered.spend, currency)}</span>
                        </p>
                        <p className="mt-1 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />{labels.plural}</span>
                            <span className="font-bold tabular-nums">{formatCount(hovered.results)}</span>
                        </p>
                        <p className="mt-1 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" />Landing page views</span>
                            <span className="font-bold tabular-nums">{formatCount(hovered.lpv)}</span>
                        </p>
                        {hovered.results > 0 && (
                            <p className="mt-1.5 border-t border-white/10 pt-1.5 text-slate-300">
                                {labels.costLabel}: <span className="font-bold text-white">{formatMoney(hovered.spend / hovered.results, currency)}</span>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
