import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';

// Shared by the ad performance API and the dashboards. Safe to import in the browser.

export type ResultType = 'purchase' | 'schedule';

export interface AdMetrics {
    spend: number;
    impressions: number;
    reach: number;
    cpm: number | null;
    linkClicks: number;
    outboundClicks: number;
    uniqueOutboundCtr: number | null; // percent, e.g. 1.84
    lpv: number;
    costPerLpv: number | null;
    results: number;
    costPerResult: number | null;
    revenue: number;
    roas: number | null;
}

export interface DailyPoint {
    date: string; // yyyy-MM-dd
    spend: number;
    results: number;
    revenue: number;
    lpv: number;
    impressions: number;
    outboundClicks: number;
    uniqueOutboundCtr: number | null;
}

export interface CampaignRow extends AdMetrics {
    id: string;
    name: string;
}

export interface AdRow extends AdMetrics {
    id: string;
    name: string;
    campaign: string;
    adset: string;
    thumbnail: string | null;
    isVideo: boolean;
    previewUrl: string | null;
    managerUrl: string;
}

export interface AdsReport {
    audience: 'team' | 'client';
    account: { id: string; name: string; currency: string; timezone: string | null };
    resultType: ResultType;
    campaignFilter: string | null;
    range: { since: string; until: string; preset: PresetId };
    previousRange: { since: string; until: string } | null;
    totals: AdMetrics;
    previous: AdMetrics | null;
    daily: DailyPoint[];
    campaigns?: CampaignRow[];
    ads?: AdRow[];
    updatedAt: string;
}

export type AdsErrorCode = 'not_configured' | 'not_linked' | 'no_access' | 'token' | 'rate_limited' | 'meta_error' | 'bad_request';

// ---------------------------------------------------------------- labels

export const resultLabels = (type: ResultType) =>
    type === 'schedule'
        ? { plural: 'Appointments', singular: 'appointment', costLabel: 'Cost per appointment' }
        : { plural: 'Sales', singular: 'sale', costLabel: 'Cost per sale' };

// ---------------------------------------------------------------- dates

export type PresetId = 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'this_month' | 'last_month' | 'maximum' | 'custom';

export const PRESETS: { id: Exclude<PresetId, 'custom'>; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7d', label: 'Last 7 days' },
    { id: 'last_14d', label: 'Last 14 days' },
    { id: 'last_30d', label: 'Last 30 days' },
    { id: 'this_month', label: 'This month' },
    { id: 'last_month', label: 'Last month' },
    { id: 'maximum', label: 'Lifetime' },
];

export interface DateSelection {
    preset: PresetId;
    since: string; // yyyy-MM-dd; empty for lifetime
    until: string;
}

export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// "Last N days" ends yesterday, the same as Ads Manager.
export function presetRange(preset: Exclude<PresetId, 'custom'>, today = new Date()): DateSelection {
    const day = (offset: number) => toISODate(addDays(today, offset));
    switch (preset) {
        case 'today':
            return { preset, since: day(0), until: day(0) };
        case 'yesterday':
            return { preset, since: day(-1), until: day(-1) };
        case 'last_7d':
            return { preset, since: day(-7), until: day(-1) };
        case 'last_14d':
            return { preset, since: day(-14), until: day(-1) };
        case 'last_30d':
            return { preset, since: day(-30), until: day(-1) };
        case 'this_month':
            return { preset, since: toISODate(startOfMonth(today)), until: day(0) };
        case 'last_month': {
            const last = subMonths(today, 1);
            return { preset, since: toISODate(startOfMonth(last)), until: toISODate(endOfMonth(last)) };
        }
        case 'maximum':
            return { preset, since: '', until: '' };
    }
}

export const presetLabel = (preset: PresetId) => PRESETS.find((p) => p.id === preset)?.label ?? 'Custom';

export function formatRange(since: string, until: string): string {
    if (!since || !until) return '';
    const a = parseISO(since);
    const b = parseISO(until);
    if (since === until) return format(a, 'd MMM yyyy');
    if (a.getFullYear() === b.getFullYear()) return `${format(a, 'd MMM')} – ${format(b, 'd MMM yyyy')}`;
    return `${format(a, 'd MMM yyyy')} – ${format(b, 'd MMM yyyy')}`;
}

export const rangeLength = (since: string, until: string) =>
    differenceInCalendarDays(parseISO(until), parseISO(since)) + 1;

// ---------------------------------------------------------------- numbers

const formatters = new Map<string, Intl.NumberFormat>();
const nf = (key: string, make: () => Intl.NumberFormat) => {
    let f = formatters.get(key);
    if (!f) {
        f = make();
        formatters.set(key, f);
    }
    return f;
};

const safeCurrency = (currency: string) => (/^[A-Z]{3}$/.test(currency) ? currency : 'INR');

export function formatMoney(value: number | null | undefined, currency: string, opts: { compact?: boolean } = {}): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const cur = safeCurrency(currency);
    if (opts.compact && Math.abs(value) >= 1000) {
        return nf(`mc-${cur}`, () =>
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, notation: 'compact', maximumFractionDigits: 1 })
        ).format(value);
    }
    const decimals = Math.abs(value) < 1000 ? 2 : 0;
    return nf(`m-${cur}-${decimals}`, () =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    ).format(value);
}

export function formatCount(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    if (opts.compact && Math.abs(value) >= 10000) {
        return nf('cc', () => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })).format(value);
    }
    return nf('c', () => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })).format(value);
}

export const formatPercent = (value: number | null | undefined, decimals = 2) =>
    value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(decimals)}%`;

export const formatRoas = (value: number | null | undefined) =>
    value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}x`;

// ---------------------------------------------------------------- metric catalogue

export type MetricKey =
    | 'spend'
    | 'results'
    | 'costPerResult'
    | 'roas'
    | 'lpv'
    | 'costPerLpv'
    | 'uniqueOutboundCtr'
    | 'cpm'
    | 'impressions'
    | 'reach'
    | 'outboundClicks'
    | 'revenue';

export interface MetricDef {
    key: MetricKey;
    label: string;
    hint: string;
    lowerIsBetter?: boolean;
    format: (value: number | null, currency: string) => string;
    // The same figure for one day, for the sparkline
    daily: (p: DailyPoint) => number | null;
}

export function metricDefs(type: ResultType): Record<MetricKey, MetricDef> {
    const labels = resultLabels(type);
    const money = (v: number | null, c: string) => formatMoney(v, c);
    const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
    return {
        spend: { key: 'spend', label: 'Amount spent', hint: 'Total spent on ads in this period.', format: money, daily: (p) => p.spend },
        results: {
            key: 'results',
            label: labels.plural,
            hint: type === 'schedule' ? 'Appointments booked, as reported by the Meta pixel.' : 'Purchases, as reported by the Meta pixel.',
            format: (v) => formatCount(v),
            daily: (p) => p.results,
        },
        costPerResult: {
            key: 'costPerResult',
            label: labels.costLabel,
            hint: `Amount spent ÷ ${labels.plural.toLowerCase()}.`,
            lowerIsBetter: true,
            format: money,
            daily: (p) => ratio(p.spend, p.results),
        },
        roas: {
            key: 'roas',
            label: 'ROAS',
            hint: 'Purchase value ÷ amount spent.',
            format: (v) => formatRoas(v),
            daily: (p) => ratio(p.revenue, p.spend),
        },
        lpv: { key: 'lpv', label: 'Landing page views', hint: 'People who clicked an ad and the landing page loaded.', format: (v) => formatCount(v), daily: (p) => p.lpv },
        costPerLpv: {
            key: 'costPerLpv',
            label: 'Cost per landing page view',
            hint: 'Amount spent ÷ landing page views.',
            lowerIsBetter: true,
            format: money,
            daily: (p) => ratio(p.spend, p.lpv),
        },
        uniqueOutboundCtr: {
            key: 'uniqueOutboundCtr',
            label: 'Unique outbound CTR',
            hint: 'Share of people reached who clicked through to the website.',
            format: (v) => formatPercent(v),
            daily: (p) => p.uniqueOutboundCtr,
        },
        cpm: {
            key: 'cpm',
            label: 'CPM',
            hint: 'Cost per 1,000 impressions.',
            lowerIsBetter: true,
            format: money,
            daily: (p) => (p.impressions > 0 ? (p.spend / p.impressions) * 1000 : null),
        },
        impressions: { key: 'impressions', label: 'Impressions', hint: 'Times the ads were shown.', format: (v) => formatCount(v, { compact: true }), daily: (p) => p.impressions },
        reach: { key: 'reach', label: 'Reach', hint: 'People who saw the ads at least once.', format: (v) => formatCount(v, { compact: true }), daily: () => null },
        outboundClicks: { key: 'outboundClicks', label: 'Outbound clicks', hint: 'Clicks that led off Facebook and Instagram.', format: (v) => formatCount(v), daily: (p) => p.outboundClicks },
        revenue: { key: 'revenue', label: 'Purchase value', hint: 'Value of purchases reported by the pixel.', format: money, daily: (p) => p.revenue },
    };
}

// Percentage change, or null when there is nothing to compare against.
export function change(current: number | null, previous: number | null | undefined): number | null {
    if (current === null || previous === null || previous === undefined || !Number.isFinite(previous) || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
}
