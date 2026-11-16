'use client';

import { useEffect, useRef } from 'react';
import { Check, Flag, MapPin, Rocket, ThumbsUp } from 'lucide-react';
import { PortalClient } from '@/types/database';
import { funnelLongName } from '@/lib/funnelTemplates';
import { ProjectSummary } from '@/lib/progress';
import { Journey, Milestone, MilestoneGroup } from '@/lib/journey';
import ProgressRing from './ProgressRing';

// The client's road to launch: every milestone in a row, a line that fills in as they go,
// "You're here" on the current one, and a date under each.

const GROUP_LABELS: Record<MilestoneGroup, string> = {
    start: 'Getting you set up',
    build: 'We build your funnel',
    launch: 'Go live',
};

const IST = 'Asia/Kolkata';
const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: IST }).toUpperCase();
const monthDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: IST });
const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });

interface JourneyTimelineProps {
    client: { funnel_type?: PortalClient['funnel_type'] | undefined; business_name: string };
    summary: ProjectSummary;
    journey: Journey;
    // The same card on the team's client page speaks about the client, not to them
    audience?: 'client' | 'team';
}

export default function JourneyTimeline({ client, summary, journey, audience = 'client' }: JourneyTimelineProps) {
    const { milestones, current, launch, stageCount } = journey;
    const n = milestones.length;
    const currentIndex = current ? milestones.indexOf(current) : -1;
    const team = audience === 'team';
    const whoWaits = team ? 'Waiting on the client' : 'Waiting on you';

    // On narrow screens the road scrolls sideways: start with "You're here" in view.
    const roadRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const road = roadRef.current;
        if (!road || currentIndex < 0 || road.scrollWidth <= road.clientWidth) return;
        const columnWidth = road.scrollWidth / n;
        road.scrollLeft = Math.max(0, columnWidth * (currentIndex + 0.5) - road.clientWidth / 2);
    }, [currentIndex, n]);

    // Consecutive milestones in the same group share one bracket above them
    const groups: { group: MilestoneGroup; start: number; span: number }[] = [];
    milestones.forEach((m, i) => {
        const last = groups[groups.length - 1];
        if (last && last.group === m.group) last.span += 1;
        else groups.push({ group: m.group, start: i, span: 1 });
    });

    const heading = !current
        ? 'Your ads are live'
        : current.kind === 'stage'
            ? `${current.tag} of ${stageCount} · ${current.title}`
            : `${tagText(current, team)} · ${current.title}`;

    const subheading = !current
        ? 'Every stage is complete.'
        : current.waitingOnClient && current.kind === 'kickoff'
            ? `${whoWaits}: ${team ? 'onboarding steps still open' : 'finish your onboarding steps below'}`
            : current.waitingOnClient && current.kind === 'approval'
                ? `${whoWaits}: ${team ? 'review and approval of our work' : 'review our work and approve it'}`
                : current.date
                    ? `${current.dateKind === 'estimate' ? 'Expected' : current.kind === 'stage' ? 'Stage ends' : 'Due'} ${longDate(current.date)}${current.overdue ? ' · running late, our team is on it' : ''}`
                    : 'In progress';

    const cols = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };

    return (
        <section className="relative overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200/80" aria-label="Your journey to launch">
            {/* Soft decoration */}
            <div
                className="pointer-events-none absolute right-0 top-0 h-40 w-72 opacity-60"
                style={{
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1.2px, transparent 1.3px)',
                    backgroundSize: '16px 16px',
                    maskImage: 'linear-gradient(to bottom left, black, transparent 70%)',
                    WebkitMaskImage: 'linear-gradient(to bottom left, black, transparent 70%)',
                }}
            />
            <div className="pointer-events-none absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

            {/* Header */}
            <div className="relative flex flex-col gap-5 px-5 pt-6 sm:px-8 sm:pt-7 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {client.funnel_type ? funnelLongName(client.funnel_type) : 'Your project'} · {client.business_name}
                    </p>
                    <h1 className="mt-2 text-lg font-bold uppercase tracking-[0.08em] text-emerald-700 sm:text-xl">{heading}</h1>
                    <p className={`mt-1 text-sm font-medium sm:text-base ${current?.waitingOnClient ? 'text-orange-600' : 'text-slate-600'}`}>{subheading}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {launch && launch.status !== 'done' && launch.date && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-4 py-2.5 ring-1 ring-emerald-200/80">
                            <Rocket className="h-5 w-5 text-emerald-600" />
                            <div className="leading-tight">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">Ads go live</p>
                                <p className="text-sm font-bold text-emerald-900">
                                    {launch.dateKind === 'estimate' ? '~' : ''}
                                    {longDate(launch.date)}
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/80">
                        <ProgressRing percent={summary.percent} size={44} stroke={5} trackClassName="text-slate-200" barClassName="text-emerald-500" label="Overall project progress">
                            <span className="text-[11px] font-bold tabular-nums text-slate-900">{summary.percent}%</span>
                        </ProgressRing>
                        <dl className="flex gap-4 pr-1 text-center">
                            {[
                                { label: 'Done', value: summary.done, tone: 'text-emerald-700' },
                                { label: 'With us', value: summary.teamPending.length, tone: 'text-slate-900' },
                                { label: team ? 'With client' : 'Needs you', value: summary.clientPending.length, tone: summary.clientPending.length > 0 ? 'text-orange-600' : 'text-slate-900' },
                            ].map((s) => (
                                <div key={s.label}>
                                    <dd className={`text-lg font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</dd>
                                    <dt className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>

            {/* The road */}
            <div ref={roadRef} className="relative overflow-x-auto px-5 pb-6 pt-6 sm:px-8 sm:pb-7">
                <div className="min-w-[760px]">
                    {/* Group brackets */}
                    <div className="grid" style={cols}>
                        {groups.map((g) => (
                            <div key={`${g.group}-${g.start}`} className="px-3" style={{ gridColumn: `${g.start + 1} / span ${g.span}` }}>
                                <p className="text-center text-sm font-medium italic text-emerald-700">{GROUP_LABELS[g.group]}</p>
                                <div className="mt-1.5 h-2.5 rounded-t-lg border-x-2 border-t-2 border-emerald-200/80" />
                            </div>
                        ))}
                    </div>

                    {/* Labels */}
                    <ol className="mt-3 grid items-end" style={cols}>
                        {milestones.map((m) => (
                            <li key={m.id} className="flex flex-col items-center px-1 text-center">
                                <Tag milestone={m} team={team} />
                                <span
                                    className={`mt-2 line-clamp-2 text-sm leading-snug ${m.status === 'current' ? 'font-bold text-slate-900' : m.status === 'done' ? 'font-semibold text-slate-700' : 'font-medium text-slate-500'}`}
                                >
                                    {m.title}
                                </span>
                            </li>
                        ))}
                    </ol>

                    {/* You're here */}
                    <div className="mt-3 grid h-9" style={cols} aria-hidden>
                        {milestones.map((m, i) => (
                            <div key={m.id} className="flex justify-center">
                                {i === currentIndex && (
                                    <span className="relative flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                                        You&rsquo;re here · {monthDay(new Date().toISOString())}
                                        <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-slate-900" />
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Track */}
                    <ol className="relative mt-2 grid h-14 items-center" style={cols}>
                        {milestones.map((m, i) => (
                            <li key={m.id} className="relative flex h-full items-center justify-center">
                                {i > 0 && <Segment side="left" filled={m.status === 'done' || m.status === 'current'} half={m.status === 'current'} />}
                                {i < n - 1 && <Segment side="right" filled={milestones[i + 1].status === 'done' || milestones[i + 1].status === 'current'} half={milestones[i + 1].status === 'current'} />}
                                <Node milestone={m} />
                            </li>
                        ))}
                    </ol>

                    {/* Dates */}
                    <ol className="mt-2 grid" style={cols}>
                        {milestones.map((m) => (
                            <li key={m.id} className="text-center">
                                {m.date ? (
                                    <span
                                        className={`text-xs font-bold tracking-wide tabular-nums ${m.overdue && m.status !== 'done' ? 'text-rose-600' : m.status === 'upcoming' ? 'text-slate-400' : 'text-slate-700'}`}
                                        title={m.dateKind === 'estimate' ? 'Estimated' : m.dateKind === 'due' ? 'Due date' : 'Completed'}
                                    >
                                        {m.dateKind === 'estimate' ? '~' : ''}
                                        {shortDate(m.date)}
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold text-slate-300">—</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

            <p className="relative border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs leading-relaxed text-slate-500 sm:px-8">
                {team
                    ? 'Dates marked ~ are estimates from each phase\u2019s due rule. They move as the client finishes onboarding and gives approvals.'
                    : 'Dates marked ~ are estimates. They move with you: finishing onboarding and giving approvals sooner brings your launch closer.'}
            </p>
        </section>
    );
}

// The approval is the client's: "Your approval" to them, "Client approval" to the team.
const tagText = (m: Milestone, team: boolean) => (team && m.kind === 'approval' ? 'Client approval' : m.tag);

function Tag({ milestone: m, team }: { milestone: Milestone; team: boolean }) {
    const style =
        m.status === 'current'
            ? m.waitingOnClient
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-emerald-700 text-white shadow-sm'
            : m.status === 'done'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                : m.kind === 'approval'
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70'
                    : 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${style}`}>
            {m.kind === 'approval' && <ThumbsUp className="h-3 w-3" />}
            {m.kind === 'launch' && <Rocket className="h-3 w-3" />}
            {tagText(m, team)}
        </span>
    );
}

// Half of the line between two milestones, drawn from this node's centre to the cell edge.
function Segment({ side, filled, half }: { side: 'left' | 'right'; filled: boolean; half: boolean }) {
    const position = side === 'left' ? 'left-0 right-1/2' : 'left-1/2 right-0';
    if (filled && !half) {
        return <span className={`absolute top-1/2 h-1.5 -translate-y-1/2 bg-emerald-500 ${position}`} />;
    }
    if (filled && half) {
        // Into the current milestone: the line fades from done to not yet
        return <span className={`absolute top-1/2 h-1.5 -translate-y-1/2 ${position} ${side === 'left' ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 'bg-gradient-to-r from-emerald-300 to-emerald-200'}`} />;
    }
    return (
        <span
            className={`absolute top-1/2 h-1 -translate-y-1/2 ${position}`}
            style={{ backgroundImage: 'repeating-linear-gradient(90deg, #cbd5e1 0 6px, transparent 6px 12px)' }}
        />
    );
}

function Node({ milestone: m }: { milestone: Milestone }) {
    if (m.kind === 'launch') {
        return (
            <span
                className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ring-4 ${m.status === 'done' ? 'bg-emerald-500 text-white ring-emerald-100' : m.status === 'current' ? 'bg-white text-emerald-600 ring-emerald-300' : 'bg-white text-emerald-500 ring-emerald-100'} shadow-sm`}
            >
                {m.status === 'current' && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/40" />}
                <Rocket className="relative h-5 w-5" />
            </span>
        );
    }
    if (m.status === 'done') {
        return (
            <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
        );
    }
    if (m.status === 'current') {
        const tone = m.waitingOnClient ? 'border-orange-500' : 'border-emerald-500';
        return (
            <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100/70">
                <span className={`absolute inset-0 animate-ping rounded-full ${m.waitingOnClient ? 'bg-orange-200/50' : 'bg-emerald-200/50'}`} />
                <span className={`relative h-7 w-7 rounded-full border-[5px] bg-white ${tone}`} />
            </span>
        );
    }
    return (
        <span className={`relative z-10 flex items-center justify-center rounded-full bg-white ring-4 ring-white ${m.kind === 'approval' ? 'h-6 w-6 border-2 border-amber-300 text-amber-500' : 'h-4 w-4 border-2 border-slate-300'}`}>
            {m.kind === 'approval' && <Flag className="h-3 w-3" />}
        </span>
    );
}

