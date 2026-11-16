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

// ---------------------------------------------------------------- what counts as a result

export interface AdsConfig {
    accountId: string;
    mode: ResultType;
    // Sales / Appointments: ad sets optimising for the standard event count, and for these custom conversions
    standard: boolean;
    customConversions: string[]; // custom conversion ids
    campaignFilter: string | null;
}

// meta_result_action holds the events for Sales / Appointments, comma separated:
// "standard" and/or "offsite_conversion.custom.<id>". Empty means the standard event only.
export function parseResultEvents(value: unknown): { standard: boolean; customConversions: string[] } {
    const tokens = typeof value === 'string' ? value.split(',').map((t) => t.trim()).filter(Boolean) : [];
    if (tokens.length === 0) return { standard: true, customConversions: [] };
    const customConversions = [
        ...new Set(tokens.map((t) => t.match(/^(?:offsite_conversion\.custom\.|cc:)(\d+)$/)?.[1]).filter(Boolean) as string[]),
    ];
    return { standard: tokens.includes('standard'), customConversions };
}

export function configFromClient(row: any): AdsConfig | null {
    const accountId = normalizeAccountId(row?.meta_ad_account_id);
    if (!accountId) return null;
    const mode: ResultType = row.meta_result_type === 'schedule' ? 'schedule' : row.meta_result_type === 'auto' ? 'auto' : 'purchase';
    return {
        accountId,
        mode,
        ...parseResultEvents(row.meta_result_action),
        campaignFilter: typeof row.meta_campaign_filter === 'string' && row.meta_campaign_filter.trim() ? row.meta_campaign_filter.trim() : null,
    };
}

// What an ad set optimises for, and the names Meta reports it under (the first one present wins).
interface ResultEvent {
    key: string; // std:PURCHASE, cc:123, goal:LANDING_PAGE_VIEWS
    label: string;
    actions: string[];
    fuzzy?: string; // otherwise any action containing this
}

const STANDARD_EVENTS: Record<string, { label: string; actions: string[]; fuzzy?: string }> = {
    PURCHASE: { label: 'Purchases', actions: ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase'] },
    SCHEDULE: { label: 'Appointments', actions: ['schedule_total', 'schedule_website', 'offsite_conversion.fb_pixel_schedule', 'omni_schedule'], fuzzy: 'schedule' },
    LEAD: { label: 'Leads', actions: ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped'] },
    COMPLETE_REGISTRATION: { label: 'Registrations', actions: ['complete_registration', 'omni_complete_registration', 'offsite_conversion.fb_pixel_complete_registration'] },
    CONTACT: { label: 'Contacts', actions: ['contact_total', 'contact_website', 'offsite_conversion.fb_pixel_contact'] },
    INITIATED_CHECKOUT: { label: 'Checkouts started', actions: ['initiate_checkout', 'omni_initiated_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'] },
    ADD_TO_CART: { label: 'Adds to cart', actions: ['add_to_cart', 'omni_add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart'] },
    SUBMIT_APPLICATION: { label: 'Applications', actions: ['submit_application_total', 'submit_application_website', 'offsite_conversion.fb_pixel_submit_application'] },
    START_TRIAL: { label: 'Trials started', actions: ['start_trial_total', 'start_trial_website', 'offsite_conversion.fb_pixel_start_trial'] },
    SUBSCRIBE: { label: 'Subscriptions', actions: ['subscribe_total', 'subscribe_website', 'offsite_conversion.fb_pixel_subscribe'] },
};

// Ad sets that optimise for something other than a pixel event
const GOAL_EVENTS: Record<string, { label: string; actions: string[] }> = {
    LANDING_PAGE_VIEWS: { label: 'Landing page views', actions: ['landing_page_view', 'omni_landing_page_view'] },
    LINK_CLICKS: { label: 'Link clicks', actions: ['link_click'] },
    LEAD_GENERATION: { label: 'Leads', actions: ['onsite_conversion.lead_grouped', 'lead'] },
    QUALITY_LEAD: { label: 'Leads', actions: ['onsite_conversion.lead_grouped', 'lead'] },
    CONVERSATIONS: { label: 'Conversations', actions: ['onsite_conversion.messaging_conversation_started_7d'] },
    POST_ENGAGEMENT: { label: 'Post engagements', actions: ['post_engagement'] },
};

const customEvent = (id: string, name?: string | null): ResultEvent => ({
    key: `cc:${id}`,
    label: name || `Custom conversion ${id}`,
    actions: [`offsite_conversion.custom.${id}`],
});

// The ad sets a Sales / Appointments client is reported on
function selectedKeys(config: AdsConfig): Set<string> {
    const keys = new Set(config.customConversions.map((id) => `cc:${id}`));
    if (config.standard) keys.add(config.mode === 'schedule' ? 'std:SCHEDULE' : 'std:PURCHASE');
    return keys;
}

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

function countEvent(list: ActionList, event: ResultEvent | null): number {
    if (!event) return 0;
    const exact = pick(list, event.actions);
    if (exact !== null) return exact;
    if (event.fuzzy && Array.isArray(list)) {
        const any = list.find((a) => a.action_type.includes(event.fuzzy!));
        if (any) return num(any.value);
    }
    return 0;
}

const eventValue = (list: ActionList, event: ResultEvent | null) => (event ? pick(list, event.actions) ?? 0 : 0);

// Custom conversion names, for labels. Ones shared from elsewhere are looked up one by one.
async function conversionNames(accountId: string, ids: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (ids.length === 0) return names;
    try {
        for (const c of await listCustomConversions(accountId)) names.set(c.id, c.name);
    } catch { }
    const missing = ids.filter((id) => !names.has(id));
    if (missing.length) {
        try {
            const rows = await cached(`ccnames:${missing.sort().join(',')}`, 60 * 60 * 1000, false, () => graph('', { ids: missing.join(','), fields: 'name' }));
            for (const id of missing) if (rows?.[id]?.name) names.set(id, rows[id].name);
        } catch { }
    }
    return names;
}

// What each ad set optimises for. Settings rarely change, so they are kept for a few hours.
const adsetGoals = new Map<string, { expires: number; goal: string | null; po: any }>();

async function eventsForAdsets(accountId: string, adsetIds: string[]): Promise<Map<string, ResultEvent | null>> {
    const now = Date.now();
    const missing = adsetIds.filter((id) => (adsetGoals.get(id)?.expires ?? 0) <= now);
    for (let i = 0; i < missing.length; i += 50) {
        const chunk = missing.slice(i, i + 50);
        try {
            const rows = await graph('', { ids: chunk.join(','), fields: 'optimization_goal,promoted_object' });
            for (const id of chunk) {
                if (adsetGoals.size > 5000) adsetGoals.delete(adsetGoals.keys().next().value as string);
                adsetGoals.set(id, { expires: now + 6 * 60 * 60 * 1000, goal: rows?.[id]?.optimization_goal ?? null, po: rows?.[id]?.promoted_object ?? null });
            }
        } catch (error) {
            // Those ad sets show their spend but no results until the next try.
            console.error('Ad set settings could not be loaded:', error);
        }
    }

    const ccIds = [...new Set(adsetIds.map((id) => adsetGoals.get(id)?.po?.custom_conversion_id).filter(Boolean).map(String))];
    const names = await conversionNames(accountId, ccIds);

    const out = new Map<string, ResultEvent | null>();
    for (const id of adsetIds) {
        const info = adsetGoals.get(id);
        let event: ResultEvent | null = null;
        if (info?.po?.custom_conversion_id) {
            const ccId = String(info.po.custom_conversion_id);
            event = customEvent(ccId, names.get(ccId));
        } else if (info?.po?.custom_event_type && STANDARD_EVENTS[info.po.custom_event_type]) {
            event = { key: `std:${info.po.custom_event_type}`, ...STANDARD_EVENTS[info.po.custom_event_type] };
        } else if (info?.goal && GOAL_EVENTS[info.goal]) {
            event = { key: `goal:${info.goal}`, ...GOAL_EVENTS[info.goal] };
        }
        out.set(id, event);
    }
    return out;
}

// ---------------------------------------------------------------- insights

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

type BaseMetrics = Omit<AdMetrics, 'results' | 'costPerResult' | 'revenue' | 'roas'>;

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function baseMetrics(row: any): BaseMetrics {
    const spend = num(row?.spend);
    const impressions = num(row?.impressions);
    const lpv = pick(row?.actions, LPV_ACTIONS) ?? 0;
    return {
        spend,
        impressions,
        reach: num(row?.reach),
        cpm: row?.cpm !== undefined ? num(row.cpm) : impressions > 0 ? (spend / impressions) * 1000 : null,
        linkClicks: num(row?.inline_link_clicks),
        outboundClicks: pick(row?.outbound_clicks, ['outbound_click']) ?? 0,
        uniqueOutboundCtr: pick(row?.unique_outbound_clicks_ctr, ['outbound_click']),
        lpv,
        costPerLpv: ratio(spend, lpv),
    };
}

const withResults = (base: BaseMetrics, results: number, revenue: number, showRoas: boolean): AdMetrics => ({
    ...base,
    results,
    costPerResult: ratio(base.spend, results),
    revenue,
    roas: showRoas ? ratio(revenue, base.spend) : null,
});

interface Range {
    since: string;
    until: string;
}

interface InsightsQuery {
    level: 'account' | 'adset' | 'campaign' | 'ad';
    range: Range | 'maximum';
    fields: string[];
    step?: 1 | 7; // time_increment
    adsetIds?: string[]; // only these ad sets
    sort?: string;
    limit?: number;
    maxPages?: number;
}

function insights(config: AdsConfig, q: InsightsQuery) {
    const filtering: { field: string; operator: string; value: unknown }[] = [];
    if (config.campaignFilter) filtering.push({ field: 'campaign.name', operator: 'CONTAIN', value: config.campaignFilter });
    if (q.adsetIds) filtering.push({ field: 'adset.id', operator: 'IN', value: q.adsetIds });
    return graphAll(
        `${config.accountId}/insights`,
        {
            level: q.level,
            fields: q.fields.join(','),
            ...(q.range === 'maximum' ? { date_preset: 'maximum' } : { time_range: { since: q.range.since, until: q.range.until } }),
            ...(q.step ? { time_increment: q.step } : {}),
            ...(filtering.length ? { filtering } : {}),
            ...(q.sort ? { sort: [q.sort] } : {}),
            limit: q.limit ?? 500,
        },
        q.maxPages ?? MAX_PAGES
    );
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

const ADSET_FIELDS = ['adset_id', 'campaign_id', 'spend', 'actions', 'action_values'];

// Results for a set of ad set rows: each counts the event its ad set optimises for.
function tally(rows: any[], events: Map<string, ResultEvent | null>, include: (adsetId: string) => boolean, countValue: boolean) {
    let results = 0;
    let revenue = 0;
    for (const r of rows) {
        const id = String(r.adset_id);
        if (!include(id)) continue;
        const event = events.get(id) ?? null;
        results += countEvent(r.actions, event);
        if (countValue) revenue += eventValue(r.action_values, event);
    }
    return { results, revenue };
}

export async function buildReport(
    config: AdsConfig,
    selection: DateSelection,
    audience: 'team' | 'client',
    fresh = false,
    detail = audience === 'team'
): Promise<AdsReport> {
    const today = toISODate(new Date());
    const live = selection.preset === 'maximum' || selection.until >= today;
    const key = `report:${audience}:${detail}:${JSON.stringify(config)}:${selection.preset}:${selection.since}:${selection.until}`;

    return cached(key, (live ? 5 : 30) * 60 * 1000, fresh, async () => {
        // Lifetime: find the dates first, then treat it like any other range.
        let range: Range;
        if (selection.preset === 'maximum') {
            const [row] = await insights(config, { level: 'account', range: 'maximum', fields: ['spend', 'date_start', 'date_stop'] });
            range = { since: row?.date_start || today, until: row?.date_stop || today };
        } else {
            range = { since: selection.since, until: selection.until };
        }

        let previousRange: Range | null = null;
        if (selection.preset !== 'maximum') {
            const days = rangeLength(range.since, range.until);
            const prevUntil = addDays(parseISO(range.since), -1);
            previousRange = { since: toISODate(addDays(prevUntil, -(days - 1))), until: toISODate(prevUntil) };
        }

        // Long ranges come back week by week, so ad set rows stay a manageable number.
        const step: 1 | 7 = rangeLength(range.since, range.until) > 92 ? 7 : 1;

        // 1. Every ad set that ran, and what each one optimises for
        const [account, adsetRows, prevAdsetRows, adsetSeries] = await Promise.all([
            accountInfo(config.accountId),
            insights(config, { level: 'adset', range, fields: ADSET_FIELDS }),
            previousRange ? insights(config, { level: 'adset', range: previousRange, fields: ADSET_FIELDS }) : Promise.resolve([] as any[]),
            insights(config, { level: 'adset', range, fields: ['adset_id', 'actions', 'action_values'], step, maxPages: 40 }),
        ]);

        const allAdsets = [...new Set([...adsetRows, ...prevAdsetRows].map((r) => String(r.adset_id)))];
        const events = await eventsForAdsets(config.accountId, allAdsets);

        // Sales / Appointments: only ad sets optimising for the chosen events. Match Ads Manager: all.
        const scoped = config.mode !== 'auto';
        const wanted = selectedKeys(config);
        const include = (adsetId: string) => !scoped || wanted.has(events.get(adsetId)?.key ?? '');
        const countValue = config.mode !== 'schedule';

        const nowIds = [...new Set(adsetRows.map((r) => String(r.adset_id)).filter(include))];
        const prevIds = [...new Set(prevAdsetRows.map((r) => String(r.adset_id)).filter(include))];
        const nothingNow = scoped && nowIds.length === 0;
        const nothingPrev = scoped && prevIds.length === 0;
        const scope = (ids: string[]) => (scoped ? ids : undefined);

        // 2. The numbers for those ad sets
        const [totalRows, prevRows, seriesRows, campaignRows, adRows] = await Promise.all([
            nothingNow ? Promise.resolve([] as any[]) : insights(config, { level: 'account', range, fields: METRIC_FIELDS, adsetIds: scope(nowIds) }),
            !previousRange || nothingPrev
                ? Promise.resolve([] as any[])
                : insights(config, { level: 'account', range: previousRange, fields: METRIC_FIELDS, adsetIds: scope(prevIds) }),
            nothingNow ? Promise.resolve([] as any[]) : insights(config, { level: 'account', range, fields: METRIC_FIELDS, step, adsetIds: scope(nowIds) }),
            detail && !nothingNow
                ? insights(config, { level: 'campaign', range, fields: ['campaign_id', 'campaign_name', ...METRIC_FIELDS], adsetIds: scope(nowIds), sort: 'spend_descending', limit: 200, maxPages: 2 })
                : Promise.resolve([] as any[]),
            detail && !nothingNow
                ? insights(config, { level: 'ad', range, fields: ['ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_name', ...METRIC_FIELDS], adsetIds: scope(nowIds), sort: 'spend_descending', limit: 100, maxPages: 1 })
                : Promise.resolve([] as any[]),
        ]);

        const now = tally(adsetRows, events, include, countValue);
        const prev = tally(prevAdsetRows, events, include, countValue);
        const showRoas = config.mode === 'purchase' || (config.mode === 'auto' && now.revenue > 0);

        // What the results are made of, e.g. 28 Purchases + 13 "Webinar sale"
        const byLabel = new Map<string, { key: string; label: string; count: number }>();
        for (const r of adsetRows) {
            const id = String(r.adset_id);
            const event = events.get(id);
            if (!include(id) || !event) continue;
            const count = countEvent(r.actions, event);
            if (!count) continue;
            const entry = byLabel.get(event.label) ?? { key: event.key, label: event.label, count: 0 };
            entry.count += count;
            byLabel.set(event.label, entry);
        }

        // Day by day (or week by week): spend and the rest from the account, results from the ad sets
        const resultsByDate = new Map<string, { results: number; revenue: number }>();
        for (const r of adsetSeries) {
            const id = String(r.adset_id);
            if (!include(id)) continue;
            const event = events.get(id) ?? null;
            const entry = resultsByDate.get(r.date_start) ?? { results: 0, revenue: 0 };
            entry.results += countEvent(r.actions, event);
            if (countValue) entry.revenue += eventValue(r.action_values, event);
            resultsByDate.set(r.date_start, entry);
        }
        const seriesByDate = new Map<string, any>(seriesRows.map((r) => [r.date_start, r]));
        const daily: DailyPoint[] = [];
        for (let d = parseISO(range.since); toISODate(d) <= range.until; d = addDays(d, step)) {
            const date = toISODate(d);
            const row = seriesByDate.get(date);
            const base = baseMetrics(row ?? {});
            const res = resultsByDate.get(date) ?? { results: 0, revenue: 0 };
            daily.push({
                date,
                spend: base.spend,
                results: res.results,
                revenue: res.revenue,
                lpv: base.lpv,
                impressions: base.impressions,
                outboundClicks: base.outboundClicks,
                uniqueOutboundCtr: row ? base.uniqueOutboundCtr : null,
            });
        }

        const campaignsWithSpend = new Set(adsetRows.filter((r) => include(String(r.adset_id)) && num(r.spend) > 0).map((r) => String(r.campaign_id)));

        const report: AdsReport = {
            audience,
            account,
            resultType: config.mode,
            showRoas,
            breakdown: [...byLabel.values()].sort((a, b) => b.count - a.count),
            granularity: step === 7 ? 'week' : 'day',
            campaignFilter: config.campaignFilter,
            campaignCount: campaignsWithSpend.size,
            range: { since: range.since, until: range.until, preset: selection.preset },
            previousRange,
            totals: withResults(baseMetrics(totalRows[0] ?? {}), now.results, now.revenue, showRoas),
            previous: previousRange ? withResults(baseMetrics(prevRows[0] ?? {}), prev.results, prev.revenue, showRoas) : null,
            daily,
            updatedAt: new Date().toISOString(),
        };

        if (detail) {
            // Campaign results are the sum of their ad sets' results.
            const perCampaign = new Map<string, { results: number; revenue: number; labels: Set<string> }>();
            for (const r of adsetRows) {
                const id = String(r.adset_id);
                if (!include(id)) continue;
                const event = events.get(id) ?? null;
                const entry = perCampaign.get(String(r.campaign_id)) ?? { results: 0, revenue: 0, labels: new Set<string>() };
                entry.results += countEvent(r.actions, event);
                if (countValue) entry.revenue += eventValue(r.action_values, event);
                if (event) entry.labels.add(event.label);
                perCampaign.set(String(r.campaign_id), entry);
            }
            report.campaigns = campaignRows
                .map((r): CampaignRow => {
                    const c = perCampaign.get(String(r.campaign_id));
                    const labels = c ? [...c.labels] : [];
                    return {
                        id: String(r.campaign_id),
                        name: r.campaign_name || 'Untitled campaign',
                        resultLabel: labels.length === 0 ? null : labels.length === 1 ? labels[0] : 'Mixed',
                        ...withResults(baseMetrics(r), c?.results ?? 0, c?.revenue ?? 0, showRoas),
                    };
                })
                .filter((c) => c.spend > 0 || c.impressions > 0);

            const spentAds = adRows.filter((r) => num(r.spend) > 0);
            const thumbs = await loadThumbnails(spentAds.slice(0, 50).map((r) => String(r.ad_id)));
            const accountDigits = config.accountId.replace(/^act_/, '');
            report.ads = spentAds.map((r): AdRow => {
                const id = String(r.ad_id);
                const t = thumbs.get(id);
                const event = events.get(String(r.adset_id)) ?? null;
                return {
                    id,
                    name: r.ad_name || 'Untitled ad',
                    campaign: r.campaign_name || '',
                    adset: r.adset_name || '',
                    resultLabel: event?.label ?? null,
                    thumbnail: t?.thumbnail ?? null,
                    isVideo: t?.isVideo ?? false,
                    previewUrl: t?.previewUrl ?? null,
                    managerUrl: `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${accountDigits}&selected_ad_ids=${id}`,
                    ...withResults(baseMetrics(r), countEvent(r.actions, event), countValue ? eventValue(r.action_values, event) : 0, showRoas),
                };
            });
        }

        if (audience === 'client') {
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
    const report = await buildReport(config, { preset: 'custom', since, until }, 'team', true, false);
    return {
        account: report.account,
        since,
        until,
        spend: report.totals.spend,
        results: report.totals.results,
        lpv: report.totals.lpv,
        campaigns: report.campaignCount,
        breakdown: report.breakdown,
    };
}

// What the account's ad sets optimised for in the last 90 days, for the Edit window's checklist.
export async function detectResultEvents(config: Pick<AdsConfig, 'accountId' | 'campaignFilter'>) {
    return cached(`detect:${config.accountId}:${config.campaignFilter ?? ''}`, 10 * 60 * 1000, false, async () => {
        const range = { since: toISODate(addDays(new Date(), -90)), until: toISODate(new Date()) };
        const full: AdsConfig = { ...config, mode: 'auto', standard: true, customConversions: [] };
        const rows = await insights(full, { level: 'adset', range, fields: ['adset_id', 'spend'] });
        const events = await eventsForAdsets(config.accountId, rows.map((r) => String(r.adset_id)));
        const byKey = new Map<string, { key: string; label: string; adsets: number; spend: number }>();
        for (const r of rows) {
            const event = events.get(String(r.adset_id));
            if (!event) continue;
            const entry = byKey.get(event.key) ?? { key: event.key, label: event.label, adsets: 0, spend: 0 };
            entry.adsets += 1;
            entry.spend += num(r.spend);
            byKey.set(event.key, entry);
        }
        return [...byKey.values()].sort((a, b) => b.spend - a.spend);
    });
}

// What an API route sends back when something goes wrong.
export function errorBody(error: unknown): { status: number; body: { error: string; code: AdsErrorCode } } {
    if (error instanceof AdsError) return { status: error.status, body: { error: error.message, code: error.code } };
    console.error('Ad performance error:', error);
    return { status: 500, body: { error: 'Could not load ad performance. Please try again.', code: 'meta_error' } };
}
