import { createHmac } from 'crypto';
import { addDays, parseISO } from 'date-fns';
import {
    AdMetrics,
    AdRow,
    AdsErrorCode,
    AdsReport,
    CampaignRow,
    DailyPoint,
    DateSelection,
    ISO_DATE,
    rangeLength,
    ResultType,
    toISODate,
} from '@/lib/adMetrics';

// Server only. Reads ad performance from Meta's Marketing API with the system user token.
//
// Environment:
//   META_SYSTEM_USER_TOKEN  required. A system user token with ads_read, from Business Settings.
//   META_APP_SECRET         optional. Needed only if the Meta app has "Require app secret" switched on.
//   META_GRAPH_VERSION      optional. Defaults to v24.0.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v24.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_PAGES = 10;

export class AdsError extends Error {
    constructor(public code: AdsErrorCode, message: string, public status = 400) {
        super(message);
    }
}

export const isAdsConfigured = () => Boolean(process.env.META_SYSTEM_USER_TOKEN);

// "act_123", "123" or " act_123 " all become "act_123". Anything else is rejected.
export function normalizeAccountId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const digits = value.trim().replace(/^act_/i, '');
    return /^\d{5,20}$/.test(digits) ? `act_${digits}` : null;
}

// ---------------------------------------------------------------- Graph API

function token(): string {
    const value = process.env.META_SYSTEM_USER_TOKEN;
    if (!value) {
        throw new AdsError('not_configured', 'Ad reporting is not set up yet. Add META_SYSTEM_USER_TOKEN in the hosting settings.', 503);
    }
    return value;
}

function withProof(url: URL, accessToken: string) {
    const secret = process.env.META_APP_SECRET;
    if (secret && !url.searchParams.has('appsecret_proof')) {
        url.searchParams.set('appsecret_proof', createHmac('sha256', secret).update(accessToken).digest('hex'));
    }
}

function toAdsError(error: any, status: number): AdsError {
    const code = Number(error?.code);
    const sub = Number(error?.error_subcode);
    const message: string = error?.message || `Meta returned an error (${status}).`;

    if (code === 190 || code === 102) {
        return new AdsError('token', 'The Meta access token was rejected. Generate a new system user token and update META_SYSTEM_USER_TOKEN.', 502);
    }
    if ([4, 17, 32, 613].includes(code) || (code >= 80000 && code <= 80014)) {
        return new AdsError('rate_limited', 'Meta is limiting requests right now. Try again in a few minutes.', 429);
    }
    if (code === 10 || code === 200 || code === 294 || code === 272 || (code >= 200 && code < 300) || (code === 100 && sub === 33)) {
        return new AdsError(
            'no_access',
            'The system user cannot read this ad account. In Business Settings, assign the ad account to the system user, then try again.',
            403
        );
    }
    return new AdsError('meta_error', message, 502);
}

async function request(url: URL): Promise<any> {
    const accessToken = token();
    withProof(url, accessToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) throw toAdsError(body?.error, res.status);
    return body;
}

async function graph(path: string, params: Record<string, unknown> = {}): Promise<any> {
    const url = new URL(`${GRAPH_URL}/${path.replace(/^\//, '')}`);
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    return request(url);
}

// Every row of a list, following Meta's pages.
async function graphAll(path: string, params: Record<string, unknown> = {}, maxPages = MAX_PAGES): Promise<any[]> {
    const rows: any[] = [];
    let body = await graph(path, params);
    rows.push(...(body?.data || []));
    for (let page = 1; page < maxPages && body?.paging?.next; page++) {
        body = await request(new URL(body.paging.next));
        rows.push(...(body?.data || []));
    }
    return rows;
}

// ---------------------------------------------------------------- small cache

const cache = new Map<string, { expires: number; value: unknown }>();

async function cached<T>(key: string, ttlMs: number, fresh: boolean, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (!fresh && hit && hit.expires > Date.now()) return hit.value as T;
    const value = await load();
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    cache.set(key, { expires: Date.now() + ttlMs, value });
    return value;
}

// ---------------------------------------------------------------- accounts

export interface AdAccountSummary {
    id: string; // act_123
    name: string;
    currency: string;
    timezone: string | null;
    business: string | null;
    active: boolean;
}

export async function listAdAccounts(fresh = false): Promise<AdAccountSummary[]> {
    return cached('accounts', 5 * 60 * 1000, fresh, async () => {
        const rows = await graphAll('me/adaccounts', {
            fields: 'id,name,currency,timezone_name,account_status,business{name}',
            limit: 200,
        });
        return rows
            .map((r) => ({
                id: String(r.id),
                name: r.name || String(r.id),
                currency: r.currency || 'INR',
                timezone: r.timezone_name || null,
                business: r.business?.name || null,
                // 1 = active. Others are disabled, closed or unsettled.
                active: Number(r.account_status) === 1,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    });
}

export interface CustomConversion {
    id: string;
    name: string;
    action: string; // the action type it reports under
    event: string | null;
}

export async function listCustomConversions(accountId: string): Promise<CustomConversion[]> {
    return cached(`cc:${accountId}`, 10 * 60 * 1000, false, async () => {
        const rows = await graphAll(`${accountId}/customconversions`, { fields: 'id,name,custom_event_type', limit: 200 }, 3);
        return rows
            .map((r) => ({
                id: String(r.id),
                name: r.name || String(r.id),
                action: `offsite_conversion.custom.${r.id}`,
                event: r.custom_event_type || null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    });
}

async function accountInfo(accountId: string) {
    return cached(`acct:${accountId}`, 60 * 60 * 1000, false, async () => {
        const row = await graph(accountId, { fields: 'name,currency,timezone_name' });
        return { id: accountId, name: row.name || accountId, currency: row.currency || 'INR', timezone: row.timezone_name || null };
    });
}

// ---------------------------------------------------------------- insights

export interface AdsConfig {
    accountId: string;
    resultType: ResultType;
    resultAction: string | null; // a custom conversion's action type, instead of the standard event
    campaignFilter: string | null;
}

export function configFromClient(row: any): AdsConfig | null {
    const accountId = normalizeAccountId(row?.meta_ad_account_id);
    if (!accountId) return null;
    return {
        accountId,
        resultType: row.meta_result_type === 'schedule' ? 'schedule' : 'purchase',
        resultAction: typeof row.meta_result_action === 'string' && row.meta_result_action.trim() ? row.meta_result_action.trim() : null,
        campaignFilter: typeof row.meta_campaign_filter === 'string' && row.meta_campaign_filter.trim() ? row.meta_campaign_filter.trim() : null,
    };
}

const METRIC_FIELDS = [
    'spend',
    'impressions',
    'reach',
    'cpm',
    'inline_link_clicks',
    'outbound_clicks',
    'unique_outbound_clicks_ctr',
    'actions',
    'action_values',
];

// Meta reports the same event under several names; the first one present wins.
const PURCHASE_ACTIONS = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase'];
const SCHEDULE_ACTIONS = ['schedule_total', 'schedule_website', 'offsite_conversion.fb_pixel_schedule', 'omni_schedule'];
const LPV_ACTIONS = ['landing_page_view', 'omni_landing_page_view'];

type ActionList = { action_type: string; value: string }[] | undefined;

const num = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

function pick(list: ActionList, types: string[]): number | null {
    if (!Array.isArray(list)) return null;
    for (const type of types) {
        const hit = list.find((a) => a.action_type === type);
        if (hit) return num(hit.value);
    }
    return null;
}

function resultTypes(config: AdsConfig): string[] {
    if (config.resultAction) return [config.resultAction];
    return config.resultType === 'schedule' ? SCHEDULE_ACTIONS : PURCHASE_ACTIONS;
}

function countResults(list: ActionList, config: AdsConfig): number {
    const exact = pick(list, resultTypes(config));
    if (exact !== null) return exact;
    // Appointments are sometimes reported under another "schedule" name.
    if (!config.resultAction && config.resultType === 'schedule' && Array.isArray(list)) {
        const any = list.find((a) => a.action_type.includes('schedule'));
        if (any) return num(any.value);
    }
    return 0;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function toMetrics(row: any, config: AdsConfig): AdMetrics {
    const spend = num(row?.spend);
    const impressions = num(row?.impressions);
    const results = countResults(row?.actions, config);
    const revenue = config.resultType === 'purchase' ? pick(row?.action_values, resultTypes(config)) ?? 0 : 0;
    const lpv = pick(row?.actions, LPV_ACTIONS) ?? 0;
    const ctr = pick(row?.unique_outbound_clicks_ctr, ['outbound_click']);
    return {
        spend,
        impressions,
        reach: num(row?.reach),
        cpm: row?.cpm !== undefined ? num(row.cpm) : impressions > 0 ? (spend / impressions) * 1000 : null,
        linkClicks: num(row?.inline_link_clicks),
        outboundClicks: pick(row?.outbound_clicks, ['outbound_click']) ?? 0,
        uniqueOutboundCtr: ctr,
        lpv,
        costPerLpv: ratio(spend, lpv),
        results,
        costPerResult: ratio(spend, results),
        revenue,
        roas: config.resultType === 'purchase' ? ratio(revenue, spend) : null,
    };
}

const emptyMetrics = (config: AdsConfig): AdMetrics => toMetrics({}, config);

interface InsightsQuery {
    level: 'account' | 'campaign' | 'ad';
    selection: { since: string; until: string } | 'maximum';
    fields: string[];
    daily?: boolean;
    sort?: string;
    limit?: number;
    maxPages?: number;
}

function insights(config: AdsConfig, q: InsightsQuery) {
    return graphAll(
        `${config.accountId}/insights`,
        {
            level: q.level,
            fields: q.fields.join(','),
            ...(q.selection === 'maximum' ? { date_preset: 'maximum' } : { time_range: { since: q.selection.since, until: q.selection.until } }),
            ...(q.daily ? { time_increment: 1 } : {}),
            ...(config.campaignFilter
                ? { filtering: [{ field: 'campaign.name', operator: 'CONTAIN', value: config.campaignFilter }] }
                : {}),
            ...(q.sort ? { sort: [q.sort] } : {}),
            limit: q.limit ?? 500,
        },
        q.maxPages ?? MAX_PAGES
    );
}

function fillDays(rows: any[], config: AdsConfig, since: string, until: string): DailyPoint[] {
    const byDate = new Map<string, any>(rows.map((r) => [r.date_start, r]));
    const days: DailyPoint[] = [];
    const last = parseISO(until);
    for (let d = parseISO(since); d <= last; d = addDays(d, 1)) {
        const date = toISODate(d);
        const m = byDate.has(date) ? toMetrics(byDate.get(date), config) : emptyMetrics(config);
        days.push({
            date,
            spend: m.spend,
            results: m.results,
            revenue: m.revenue,
            lpv: m.lpv,
            impressions: m.impressions,
            outboundClicks: m.outboundClicks,
            uniqueOutboundCtr: byDate.has(date) ? m.uniqueOutboundCtr : null,
        });
    }
    return days;
}

async function loadThumbnails(adIds: string[]) {
    const out = new Map<string, { thumbnail: string | null; isVideo: boolean; previewUrl: string | null }>();
    if (adIds.length === 0) return out;
    try {
        const ads = await graph('', { ids: adIds.join(','), fields: 'creative{id},preview_shareable_link' });
        const creativeIds = [...new Set(Object.values<any>(ads).map((a) => a?.creative?.id).filter(Boolean))] as string[];
        const creatives = creativeIds.length
            ? await graph('', {
                ids: creativeIds.join(','),
                fields: 'thumbnail_url,image_url,object_type,video_id',
                thumbnail_width: 600,
                thumbnail_height: 600,
            })
            : {};
        for (const id of adIds) {
            const ad = ads?.[id];
            const creative = ad?.creative?.id ? creatives?.[ad.creative.id] : null;
            out.set(id, {
                thumbnail: creative?.image_url || creative?.thumbnail_url || null,
                isVideo: Boolean(creative?.video_id) || creative?.object_type === 'VIDEO',
                previewUrl: ad?.preview_shareable_link || null,
            });
        }
    } catch (error) {
        // Thumbnails are a nice-to-have: the numbers still show without them.
        console.error('Ad thumbnails could not be loaded:', error);
    }
    return out;
}

// ---------------------------------------------------------------- report

export function validateSelection(preset: string | null, since: string | null, until: string | null): DateSelection {
    if (preset === 'maximum') return { preset: 'maximum', since: '', until: '' };
    if (!since || !until || !ISO_DATE.test(since) || !ISO_DATE.test(until)) {
        throw new AdsError('bad_request', 'Choose a start and end date.', 400);
    }
    if (since > until) throw new AdsError('bad_request', 'The start date is after the end date.', 400);
    // Meta keeps about 37 months of insights.
    if (rangeLength(since, until) > 1150) throw new AdsError('bad_request', 'Choose a range of three years or less.', 400);
    const known = ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month'];
    return { preset: (known.includes(preset || '') ? preset : 'custom') as DateSelection['preset'], since, until };
}

export async function buildReport(
    config: AdsConfig,
    selection: DateSelection,
    audience: 'team' | 'client',
    fresh = false
): Promise<AdsReport> {
    const today = toISODate(new Date());
    const live = selection.preset === 'maximum' || selection.until >= today;
    const key = `report:${audience}:${JSON.stringify(config)}:${selection.preset}:${selection.since}:${selection.until}`;

    return cached(key, (live ? 5 : 30) * 60 * 1000, fresh, async () => {
        const range = selection.preset === 'maximum' ? ('maximum' as const) : { since: selection.since, until: selection.until };

        let previousRange: { since: string; until: string } | null = null;
        if (range !== 'maximum') {
            const days = rangeLength(range.since, range.until);
            const prevUntil = addDays(parseISO(range.since), -1);
            previousRange = { since: toISODate(addDays(prevUntil, -(days - 1))), until: toISODate(prevUntil) };
        }

        const team = audience === 'team';
        const [account, totalRows, previousRows, dailyRows, campaignRows, adRows] = await Promise.all([
            accountInfo(config.accountId),
            insights(config, { level: 'account', selection: range, fields: [...METRIC_FIELDS, 'date_start', 'date_stop'] }),
            previousRange ? insights(config, { level: 'account', selection: previousRange, fields: METRIC_FIELDS }) : Promise.resolve(null),
            insights(config, { level: 'account', selection: range, fields: METRIC_FIELDS, daily: true }),
            team
                ? insights(config, { level: 'campaign', selection: range, fields: ['campaign_id', 'campaign_name', ...METRIC_FIELDS], sort: 'spend_descending', limit: 200, maxPages: 2 })
                : Promise.resolve([]),
            team
                ? insights(config, { level: 'ad', selection: range, fields: ['ad_id', 'ad_name', 'adset_name', 'campaign_name', ...METRIC_FIELDS], sort: 'spend_descending', limit: 100, maxPages: 1 })
                : Promise.resolve([]),
        ]);

        const totalsRow = totalRows[0];
        let since = range === 'maximum' ? totalsRow?.date_start || dailyRows[0]?.date_start || today : range.since;
        let until = range === 'maximum' ? totalsRow?.date_stop || dailyRows[dailyRows.length - 1]?.date_start || today : range.until;
        if (since > until) [since, until] = [until, since];

        const report: AdsReport = {
            audience,
            account,
            resultType: config.resultType,
            campaignFilter: config.campaignFilter,
            range: { since, until, preset: selection.preset },
            previousRange,
            totals: totalsRow ? toMetrics(totalsRow, config) : emptyMetrics(config),
            previous: previousRows ? (previousRows[0] ? toMetrics(previousRows[0], config) : emptyMetrics(config)) : null,
            daily: fillDays(dailyRows, config, since, until),
            updatedAt: new Date().toISOString(),
        };

        if (team) {
            report.campaigns = campaignRows
                .map((r): CampaignRow => ({ id: String(r.campaign_id), name: r.campaign_name || 'Untitled campaign', ...toMetrics(r, config) }))
                .filter((c) => c.spend > 0 || c.impressions > 0);

            const spentAds = adRows.filter((r) => num(r.spend) > 0);
            const thumbs = await loadThumbnails(spentAds.slice(0, 50).map((r) => String(r.ad_id)));
            const accountDigits = config.accountId.replace(/^act_/, '');
            report.ads = spentAds.map((r): AdRow => {
                const id = String(r.ad_id);
                const t = thumbs.get(id);
                return {
                    id,
                    name: r.ad_name || 'Untitled ad',
                    campaign: r.campaign_name || '',
                    adset: r.adset_name || '',
                    thumbnail: t?.thumbnail ?? null,
                    isVideo: t?.isVideo ?? false,
                    previewUrl: t?.previewUrl ?? null,
                    managerUrl: `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${accountDigits}&selected_ad_ids=${id}`,
                    ...toMetrics(r, config),
                };
            });
        } else {
            // Clients see their results, not our media-buying detail.
            report.campaignFilter = null;
            report.totals = { ...report.totals, cpm: null, reach: 0, linkClicks: 0 };
            if (report.previous) report.previous = { ...report.previous, cpm: null, reach: 0, linkClicks: 0 };
        }

        return report;
    });
}

// Last 7 days for the Edit window's "Test connection".
export async function checkConnection(config: AdsConfig) {
    const until = toISODate(addDays(new Date(), -1));
    const since = toISODate(addDays(new Date(), -7));
    const [account, totals, campaigns] = await Promise.all([
        accountInfo(config.accountId),
        insights(config, { level: 'account', selection: { since, until }, fields: METRIC_FIELDS }),
        insights(config, { level: 'campaign', selection: { since, until }, fields: ['campaign_id', 'spend'], limit: 200, maxPages: 2 }),
    ]);
    const m = totals[0] ? toMetrics(totals[0], config) : emptyMetrics(config);
    return {
        account,
        since,
        until,
        spend: m.spend,
        results: m.results,
        lpv: m.lpv,
        campaigns: campaigns.filter((c) => num(c.spend) > 0).length,
    };
}

// What an API route sends back when something goes wrong.
export function errorBody(error: unknown): { status: number; body: { error: string; code: AdsErrorCode } } {
    if (error instanceof AdsError) return { status: error.status, body: { error: error.message, code: error.code } };
    console.error('Ad performance error:', error);
    return { status: 500, body: { error: 'Could not load ad performance. Please try again.', code: 'meta_error' } };
}
