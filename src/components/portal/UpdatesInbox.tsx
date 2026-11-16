'use client';

import { ArrowRight, Bell, BellRing, CheckCircle2, Eye, PartyPopper, Rocket, Sparkles } from 'lucide-react';
import { UpdateItem, UpdateKind, UpdateView } from '@/lib/updates';

// The Updates tab in the client portal: today's nudge pinned on top, then everything our team
// has finished and anything waiting on the client, newest first, grouped by day.

interface UpdatesFeedProps {
    updates: UpdateItem[];
    // Updates after this were new when the tab was opened; they keep their highlight on this visit
    seenBefore: string | null;
    isTeamPreview: boolean;
    onOpenView: (view: UpdateView) => void;
}

const KIND_STYLE: Record<UpdateKind, { icon: typeof Bell; tone: string }> = {
    welcome: { icon: Sparkles, tone: 'bg-indigo-50 text-indigo-600' },
    done: { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
    stage: { icon: PartyPopper, tone: 'bg-violet-50 text-violet-600' },
    review: { icon: Eye, tone: 'bg-amber-50 text-amber-600' },
    live: { icon: Rocket, tone: 'bg-emerald-100 text-emerald-700' },
    nudge: { icon: BellRing, tone: 'bg-orange-100 text-orange-600' },
};

const IST = 'Asia/Kolkata';
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: IST });

function dayLabel(iso: string) {
    const key = dayKey(iso);
    if (key === dayKey(new Date().toISOString())) return 'Today';
    if (key === dayKey(new Date(Date.now() - 86400000).toISOString())) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });
}

function timeLabel(iso: string) {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 12 * 60) return `${Math.round(minutes / 60)} h ago`;
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: IST });
}

export default function UpdatesFeed({ updates, seenBefore, isTeamPreview, onOpenView }: UpdatesFeedProps) {
    const nudge = updates.find((u) => u.kind === 'nudge') ?? null;
    const rest = updates.filter((u) => u !== nudge);
    const groups: { label: string; items: UpdateItem[] }[] = [];
    for (const item of rest) {
        const label = dayLabel(item.at);
        const last = groups[groups.length - 1];
        if (last && last.label === label) last.items.push(item);
        else groups.push({ label, items: [item] });
    }
    const isNew = (item: UpdateItem) => !seenBefore || item.at > seenBefore;
    const newCount = updates.filter(isNew).length;

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Updates</h1>
                    <p className="mt-1 text-sm text-slate-500">Finished work, things to review, and anything we need from you.</p>
                </div>
                {newCount > 0 && (
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
                        {newCount} new{isTeamPreview ? ' for the client' : ''}
                    </span>
                )}
            </div>

            {nudge && (
                <div className="mb-4 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-200 sm:p-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                            <BellRing className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold leading-snug text-orange-950">{nudge.title}</p>
                            {nudge.items && (
                                <ul className="mt-2 space-y-1">
                                    {nudge.items.map((name) => (
                                        <li key={name} className="flex items-start gap-2 text-sm text-orange-950/90">
                                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {nudge.body && <p className="mt-2 text-xs text-orange-900/70">{nudge.body}</p>}
                            {nudge.action && (
                                <button
                                    type="button"
                                    onClick={() => onOpenView(nudge.action!.view)}
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
                                >
                                    {nudge.action.label}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {groups.map((group) => (
                <section key={group.label} className="mb-3">
                    <h2 className="px-1 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{group.label}</h2>
                    <ul className="space-y-2">
                        {group.items.map((item) => {
                            const { icon: Icon, tone } = KIND_STYLE[item.kind];
                            const fresh = isNew(item);
                            return (
                                <li key={item.id} className={`flex gap-3 rounded-2xl p-4 ${fresh ? 'bg-indigo-50/60 ring-1 ring-indigo-100' : 'bg-white ring-1 ring-slate-200/70'}`}>
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">{item.title}</p>
                                            <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[11px] font-medium text-slate-400">
                                                {timeLabel(item.at)}
                                                {fresh && <span className="h-2 w-2 rounded-full bg-indigo-500" aria-label="New" />}
                                            </span>
                                        </div>
                                        {item.body && <p className="mt-1 text-[13px] leading-snug text-slate-500 sm:text-sm">{item.body}</p>}
                                        {item.action && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenView(item.action!.view)}
                                                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 sm:text-sm"
                                            >
                                                {item.action.label}
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}
