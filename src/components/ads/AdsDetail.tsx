'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, ImageOff, Play, Trophy } from 'lucide-react';
import { AdRow, CampaignRow, formatCount, formatMoney, formatPercent, formatRoas, ResultType, resultLabels } from '@/lib/adMetrics';
import Card from './Card';

// Team-only detail under the ad performance charts: which creatives and campaigns drive results.

type AdSort = 'results' | 'cpr' | 'roas' | 'spend';

export function TopAds({ ads, resultType, currency }: { ads: AdRow[]; resultType: ResultType; currency: string }) {
    const labels = resultLabels(resultType);
    const [sort, setSort] = useState<AdSort>('results');
    const [showAll, setShowAll] = useState(false);

    const options: { id: AdSort; label: string }[] = [
        { id: 'results', label: `Most ${labels.plural.toLowerCase()}` },
        { id: 'cpr', label: 'Lowest cost' },
        ...(resultType === 'purchase' ? [{ id: 'roas' as AdSort, label: 'Highest ROAS' }] : []),
        { id: 'spend', label: 'Most spend' },
    ];

    const sorted = useMemo(() => {
        const list = [...ads];
        switch (sort) {
            case 'results':
                return list.sort((a, b) => b.results - a.results || (a.costPerResult ?? Infinity) - (b.costPerResult ?? Infinity) || b.spend - a.spend);
            case 'cpr':
                // Ads with no results yet go last
                return list.sort((a, b) => (a.costPerResult ?? Infinity) - (b.costPerResult ?? Infinity) || b.spend - a.spend);
            case 'roas':
                return list.sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1) || b.spend - a.spend);
            case 'spend':
                return list.sort((a, b) => b.spend - a.spend);
        }
    }, [ads, sort]);

    const shown = showAll ? sorted : sorted.slice(0, 6);

    return (
        <Card
            title="Top ads"
            subtitle={`${ads.length} ${ads.length === 1 ? 'ad' : 'ads'} with spend in this period`}
            action={
                <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Rank ads by">
                    {options.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => setSort(o.id)}
                            aria-pressed={sort === o.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${sort === o.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            }
        >
            {ads.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No ads spent anything in this period.</p>
            ) : (
                <>
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map((ad, i) => (
                            <AdCard key={ad.id} ad={ad} rank={i + 1} resultType={resultType} currency={currency} />
                        ))}
                    </ul>
                    {sorted.length > 6 && (
                        <button
                            type="button"
                            onClick={() => setShowAll((s) => !s)}
                            className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        >
                            {showAll ? 'Show top 6' : `Show all ${sorted.length} ads`}
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}

function AdCard({ ad, rank, resultType, currency }: { ad: AdRow; rank: number; resultType: ResultType; currency: string }) {
    const labels = resultLabels(resultType);
    const [broken, setBroken] = useState(false);
    const stats = [
        { label: 'Spent', value: formatMoney(ad.spend, currency) },
        { label: labels.plural, value: formatCount(ad.results), strong: true },
        { label: labels.costLabel.replace('Cost per', 'Cost /'), value: formatMoney(ad.costPerResult, currency) },
        resultType === 'purchase'
            ? { label: 'ROAS', value: formatRoas(ad.roas) }
            : { label: 'Landing page views', value: formatCount(ad.lpv) },
        { label: 'Unique outbound CTR', value: formatPercent(ad.uniqueOutboundCtr) },
        { label: 'Cost / LPV', value: formatMoney(ad.costPerLpv, currency) },
    ];
    const link = ad.previewUrl || ad.managerUrl;

    return (
        <li className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-lg">
            <a href={link} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
                {ad.thumbnail && !broken ? (
                    // Meta's image links expire, so they are shown as they come rather than optimised.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={ad.thumbnail}
                        alt={`Creative for ${ad.name}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setBroken(true)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                        <ImageOff className="h-6 w-6" />
                        <span className="text-xs font-medium">No preview</span>
                    </div>
                )}
                <span
                    className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${rank === 1 ? 'bg-amber-400 text-amber-950' : 'bg-white/95 text-slate-900'}`}
                >
                    {rank === 1 && <Trophy className="h-3.5 w-3.5" />}#{rank}
                </span>
                {ad.isVideo && (
                    <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur">
                        <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                    </span>
                )}
            </a>
            <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900" title={ad.name}>{ad.name}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500" title={`${ad.campaign} › ${ad.adset}`}>{ad.campaign}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-slate-100 pt-3">
                    {stats.map((s) => (
                        <div key={s.label} className="min-w-0">
                            <dt className="truncate text-[11px] font-medium text-slate-500">{s.label}</dt>
                            <dd className={`truncate text-sm tabular-nums ${s.strong ? 'font-bold text-emerald-700' : 'font-semibold text-slate-900'}`}>{s.value}</dd>
                        </div>
                    ))}
                </dl>
                <div className="mt-auto flex gap-3 pt-3 text-xs font-semibold">
                    {ad.previewUrl && (
                        <a href={ad.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                            Preview <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                    <a href={ad.managerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
                        Ads Manager <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>
        </li>
    );
}

// ---------------------------------------------------------------- campaigns

type ColumnKey = 'name' | 'spend' | 'results' | 'costPerResult' | 'roas' | 'lpv' | 'costPerLpv' | 'uniqueOutboundCtr' | 'cpm';

export function CampaignTable({ campaigns, resultType, currency }: { campaigns: CampaignRow[]; resultType: ResultType; currency: string }) {
    const labels = resultLabels(resultType);
    const [sortKey, setSortKey] = useState<ColumnKey>('spend');
    const [asc, setAsc] = useState(false);

    const columns: { key: ColumnKey; label: string; render: (c: CampaignRow) => string }[] = [
        { key: 'spend', label: 'Spent', render: (c) => formatMoney(c.spend, currency) },
        { key: 'results', label: labels.plural, render: (c) => formatCount(c.results) },
        { key: 'costPerResult', label: labels.costLabel.replace('Cost per', 'Cost /'), render: (c) => formatMoney(c.costPerResult, currency) },
        ...(resultType === 'purchase' ? [{ key: 'roas' as ColumnKey, label: 'ROAS', render: (c: CampaignRow) => formatRoas(c.roas) }] : []),
        { key: 'lpv', label: 'LPV', render: (c) => formatCount(c.lpv) },
        { key: 'costPerLpv', label: 'Cost / LPV', render: (c) => formatMoney(c.costPerLpv, currency) },
        { key: 'uniqueOutboundCtr', label: 'Unique outbound CTR', render: (c) => formatPercent(c.uniqueOutboundCtr) },
        { key: 'cpm', label: 'CPM', render: (c) => formatMoney(c.cpm, currency) },
    ];

    const sorted = useMemo(() => {
        const value = (c: CampaignRow) => (sortKey === 'name' ? c.name.toLowerCase() : (c[sortKey] as number | null));
        return [...campaigns].sort((a, b) => {
            const va = value(a);
            const vb = value(b);
            // Empty values always sink to the bottom
            if (va === null || va === undefined) return 1;
            if (vb === null || vb === undefined) return -1;
            const diff = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number);
            return asc ? diff : -diff;
        });
    }, [campaigns, sortKey, asc]);

    const sortBy = (key: ColumnKey) => {
        if (key === sortKey) setAsc((a) => !a);
        else {
            setSortKey(key);
            // Costs read best cheapest first; everything else biggest first
            setAsc(key === 'name' || key === 'costPerResult' || key === 'costPerLpv' || key === 'cpm');
        }
    };

    return (
        <Card title="Campaigns" subtitle={`${campaigns.length} ${campaigns.length === 1 ? 'campaign' : 'campaigns'} with delivery in this period`}>
            {campaigns.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No campaigns ran in this period.</p>
            ) : (
                <div className="-mx-5 overflow-x-auto sm:-mx-6">
                    <table className="w-full min-w-[820px] text-sm">
                        <thead>
                            <tr className="border-y border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="px-5 py-2.5 text-left sm:px-6">
                                    <button type="button" onClick={() => sortBy('name')} className="inline-flex items-center gap-1 uppercase hover:text-slate-900">
                                        Campaign <SortArrow show={sortKey === 'name'} asc={asc} />
                                    </button>
                                </th>
                                {columns.map((col) => (
                                    <th key={col.key} className="whitespace-nowrap px-3 py-2.5 text-right last:pr-5 sm:last:pr-6">
                                        <button type="button" onClick={() => sortBy(col.key)} className="inline-flex items-center gap-1 uppercase hover:text-slate-900">
                                            <SortArrow show={sortKey === col.key} asc={asc} /> {col.label}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((c) => (
                                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                    <td className="max-w-[260px] px-5 py-3 sm:px-6">
                                        <p className="truncate font-semibold text-slate-900" title={c.name}>{c.name}</p>
                                    </td>
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`whitespace-nowrap px-3 py-3 text-right tabular-nums last:pr-5 sm:last:pr-6 ${col.key === 'results' ? 'font-bold text-emerald-700' : 'font-medium text-slate-700'}`}
                                        >
                                            {col.render(c)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

function SortArrow({ show, asc }: { show: boolean; asc: boolean }) {
    if (!show) return null;
    return asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}
