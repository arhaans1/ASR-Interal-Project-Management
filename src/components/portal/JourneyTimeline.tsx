'use client';

import ScrollArea from '@/components/ScrollArea';
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
        <section data-compact={team || undefined} className="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80" aria-label="Your journey to launch">
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
            <div className={`relative flex flex-col gap-4 px-5 sm:px-7 lg:flex-row lg:items-start lg:justify-between ${team ? 'pt-4' : 'pt-5 short:pt-4 roomy:px-8 roomy:pt-7'}`}>
                <div className="min-w-0">
                    {/* The team page's header already names the client and funnel */}
                    {!team && (
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 roomy:mb-2 roomy:text-[11px]">
                            {client.funnel_type ? funnelLongName(client.funnel_type) : 'Your project'} · {client.business_name}
                        </p>
                    )}
                    <h1 className="text-base font-bold uppercase tracking-[0.08em] text-emerald-700 sm:text-[17px] roomy:text-xl">{heading}</h1>
                    <p className={`mt-0.5 text-sm font-medium roomy:mt-1 roomy:text-base ${current?.waitingOnClient ? 'text-orange-600' : 'text-slate-600'}`}>{subheading}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {launch && launch.status !== 'done' && launch.date && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200/80">
                            <Rocket className="h-4 w-4 text-emerald-600" />
                            <div className="leading-tight">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700/80">Ads go live</p>
                                <p className="text-[13px] font-bold text-emerald-900">
                                    {launch.dateKind === 'estimate' ? '~' : ''}
                                    {longDate(launch.date)}
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/80">
                        <ProgressRing percent={summary.percent} size={38} stroke={4} trackClassName="text-slate-200" barClassName="text-emerald-500" label="Overall project progress">
                            <span className="text-[10px] font-bold tabular-nums text-slate-900">{summary.percent}%</span>
                        </ProgressRing>
                        <dl className="flex gap-3.5 pr-1 text-center">
                            {[
                                { label: 'Done', value: summary.done, tone: 'text-emerald-700' },
                                { label: 'With us', value: summary.teamPending.length, tone: 'text-slate-900' },
                                { label: team ? 'With client' : 'Needs you', value: summary.clientPending.length, tone: summary.clientPending.length > 0 ? 'text-orange-600' : 'text-slate-900' },
                            ].map((s) => (
                                <div key={s.label}>
                                    <dd className={`text-base font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</dd>
                                    <dt className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>

            {/* Phones: the road as a vertical list of steps */}
            <VerticalRoad milestones={milestones} team={team} currentIndex={currentIndex} />

            {/* Wider screens: the road runs across, and says so when it needs a scroll */}
            <div className="hidden md:block">
            <ScrollArea className={`px-5 sm:px-7 ${team ? 'pb-3 pt-2' : 'pb-4 pt-4 short:pb-3 short:pt-2 roomy:px-8 roomy:pb-7 roomy:pt-6'}`} hint="Swipe to see every stage" focusFraction={currentIndex >= 0 ? (currentIndex + 0.5) / n : undefined}>
                <div className="min-w-[880px]">
                    {/* Group brackets */}
                    <div className="grid" style={cols}>
                        {groups.map((g) => (
                            <div key={`${g.group}-${g.start}`} className="px-3" style={{ gridColumn: `${g.start + 1} / span ${g.span}` }}>
                                <p className={`text-center font-medium italic text-emerald-700 ${team ? 'text-[11px]' : 'text-xs roomy:text-sm'}`}>{GROUP_LABELS[g.group]}</p>
                                <div className={`rounded-t-md border-x-2 border-t-2 border-emerald-200/80 ${team ? 'mt-0.5 h-1.5' : 'mt-1 h-2'}`} />
                            </div>
                        ))}
                    </div>

                    {/* Labels */}
                    <ol className={`grid items-end ${team ? 'mt-1.5' : 'mt-2 roomy:mt-3'}`} style={cols}>
                        {milestones.map((m) => (
                            <li key={m.id} className="flex flex-col items-center px-1 text-center">
                                <Tag milestone={m} team={team} />
                                <span
                                    className={`mt-1 line-clamp-2 text-[13px] leading-snug roomy:mt-2 roomy:text-sm ${m.status === 'current' ? 'font-bold text-slate-900' : m.status === 'done' ? 'font-semibold text-slate-700' : 'font-medium text-slate-500'}`}
                                >
                                    {m.title}
                                </span>
                            </li>
                        ))}
                    </ol>

                    {/* You're here (the team page marks the current date instead, to save height) */}
                    {!team && (
                    <div className="mt-2 grid h-7 roomy:mt-3 roomy:h-9" style={cols} aria-hidden>
                        {milestones.map((m, i) => (
                            <div key={m.id} className="flex justify-center">
                                {i === currentIndex && (
                                    <span className="relative flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md roomy:px-3 roomy:py-1.5 roomy:text-xs">
                                        <MapPin className="h-3 w-3 text-emerald-400" />
                                        You&rsquo;re here · {monthDay(new Date().toISOString())}
                                        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    )}

                    {/* Track */}
                    <ol className={`relative grid items-center ${team ? 'mt-1.5 h-10' : 'mt-1 h-11 roomy:mt-2 roomy:h-14'}`} style={cols}>
                        {milestones.map((m, i) => (
                            <li key={m.id} className="relative flex h-full items-center justify-center">
                                {i > 0 && <Segment side="left" filled={m.status === 'done' || m.status === 'current'} half={m.status === 'current'} />}
                                {i < n - 1 && <Segment side="right" filled={milestones[i + 1].status === 'done' || milestones[i + 1].status === 'current'} half={milestones[i + 1].status === 'current'} />}
                                <Node milestone={m} />
                            </li>
                        ))}
                    </ol>

                    {/* Dates */}
                    <ol className="mt-1 grid roomy:mt-2" style={cols}>
                        {milestones.map((m, i) => (
                            <li key={m.id} className="text-center">
                                {m.date ? (
                                    <span
                                        className={`inline-flex items-center gap-1 text-[11px] font-bold tracking-wide tabular-nums roomy:text-xs ${team && i === currentIndex ? (m.waitingOnClient ? 'text-orange-600' : 'text-emerald-700') : m.overdue && m.status !== 'done' ? 'text-rose-600' : m.status === 'upcoming' ? 'text-slate-400' : 'text-slate-700'}`}
                                        title={
                                            m.dateKind === 'estimate'
                                                ? 'Estimated from the phase\u2019s due rule. Moves as the client finishes onboarding and gives approvals.'
                                                : m.dateKind === 'due'
                                                    ? 'Due date'
                                                    : 'Completed'
                                        }
                                    >
                                        {team && i === currentIndex && <MapPin className="h-3 w-3" />}
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
            </ScrollArea>
            </div>

            <p className={`relative border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[11px] leading-relaxed text-slate-500 sm:px-7 short:hidden roomy:px-8 roomy:py-3 roomy:text-xs ${team ? 'md:hidden' : ''}`}>
                {team
                    ? 'Dates marked ~ are estimates from each phase\u2019s due rule. They move as the client finishes onboarding and gives approvals.'
                    : 'Dates marked ~ are estimates. They move with you: finishing onboarding and giving approvals sooner brings your launch closer.'}
            </p>
        </section>
    );
}

// The approval is the client's: "Your approval" to them, "Client approval" to the team.
const tagText = (m: Milestone, team: boolean) => (team && m.kind === 'approval' ? 'Client approval' : m.tag);

function VerticalRoad({ milestones, team, currentIndex }: { milestones: Milestone[]; team: boolean; currentIndex: number }) {
    return (
        <ol className="relative px-5 pb-5 pt-5 md:hidden" aria-label="Stages">
            {milestones.map((m, i) => {
                const next = milestones[i + 1];
                const newGroup = i === 0 || milestones[i - 1].group !== m.group;
                const intoFilled = m.status === 'done' || m.status === 'current';
                const outFilled = next ? next.status === 'done' || next.status === 'current' : false;
                const isCurrent = i === currentIndex;
                return (
                    <li key={m.id}>
                        {newGroup && (
                            <div className="relative flex gap-2">
                                {/* The rail carries on through the group label */}
                                <div className="relative w-12 shrink-0">{i > 0 && <RailLine part="full" filled={intoFilled} />}</div>
                                <p className={`pb-1 text-xs font-medium italic text-emerald-700 ${i === 0 ? '' : 'pt-2'}`}>{GROUP_LABELS[m.group]}</p>
                            </div>
                        )}
                        <div className="relative flex gap-2">
                            {/* Rail: half a line into this step, half a line out of it */}
                            <div className="relative flex w-12 shrink-0 justify-center">
                                {i > 0 && <RailLine part="top" filled={intoFilled} />}
                                {next && <RailLine part="bottom" filled={outFilled} />}
                                <span className="relative z-10 mt-2 flex h-12 items-center justify-center">
                                    <Node milestone={m} />
                                </span>
                            </div>
                            <div
                                className={`my-1.5 min-w-0 flex-1 rounded-2xl px-3.5 py-2.5 ${isCurrent
                                    ? m.waitingOnClient
                                        ? 'bg-orange-50 ring-1 ring-orange-200'
                                        : 'bg-emerald-50 ring-1 ring-emerald-200'
                                    : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <Tag milestone={m} team={team} />
                                    {m.date && (
                                        <span className={`shrink-0 text-xs font-bold tabular-nums ${m.overdue && m.status !== 'done' ? 'text-rose-600' : m.status === 'upcoming' ? 'text-slate-400' : 'text-slate-700'}`}>
                                            {m.dateKind === 'estimate' ? '~' : ''}
                                            {shortDate(m.date)}
                                        </span>
                                    )}
                                </div>
                                <p className={`mt-1 text-[15px] leading-snug ${m.status === 'current' ? 'font-bold text-slate-900' : m.status === 'done' ? 'font-semibold text-slate-700' : 'font-medium text-slate-500'}`}>
                                    {m.title}
                                </p>
                                {isCurrent && (
                                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                                        <MapPin className="h-3 w-3 text-emerald-400" />
                                        You&rsquo;re here · {monthDay(new Date().toISOString())}
                                    </p>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function RailLine({ part, filled }: { part: 'top' | 'bottom' | 'full'; filled: boolean }) {
    const position = part === 'top' ? 'top-0 h-8' : part === 'bottom' ? 'top-8 bottom-0' : 'inset-y-0';
    return filled ? (
        <span className={`absolute left-1/2 w-1.5 -translate-x-1/2 bg-emerald-500 ${position}`} />
    ) : (
        <span
            className={`absolute left-1/2 w-1 -translate-x-1/2 ${position}`}
            style={{ backgroundImage: 'repeating-linear-gradient(180deg, #cbd5e1 0 6px, transparent 6px 12px)' }}
        />
    );
}

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
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] roomy:px-2 roomy:py-1 roomy:text-[10px] ${style}`}>
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
        return <span className={`absolute top-1/2 h-1 -translate-y-1/2 bg-emerald-500 ${position}`} />;
    }
    if (filled && half) {
        // Into the current milestone: the line fades from done to not yet
        return <span className={`absolute top-1/2 h-1 -translate-y-1/2 ${position} ${side === 'left' ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 'bg-gradient-to-r from-emerald-300 to-emerald-200'}`} />;
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
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-4 roomy:h-12 roomy:w-12 ${m.status === 'done' ? 'bg-emerald-500 text-white ring-emerald-100' : m.status === 'current' ? 'bg-white text-emerald-600 ring-emerald-300' : 'bg-white text-emerald-500 ring-emerald-100'} shadow-sm`}
            >
                {m.status === 'current' && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/40" />}
                <Rocket className="relative h-4 w-4" />
            </span>
        );
    }
    if (m.status === 'done') {
        return (
            <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white roomy:h-6 roomy:w-6">
                <Check className="h-3 w-3" strokeWidth={3} />
            </span>
        );
    }
    if (m.status === 'current') {
        const tone = m.waitingOnClient ? 'border-orange-500' : 'border-emerald-500';
        return (
            <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100/70 roomy:h-11 roomy:w-11">
                <span className={`absolute inset-0 animate-ping rounded-full ${m.waitingOnClient ? 'bg-orange-200/50' : 'bg-emerald-200/50'}`} />
                <span className={`relative h-6 w-6 rounded-full border-4 bg-white roomy:h-7 roomy:w-7 roomy:border-[5px] ${tone}`} />
            </span>
        );
    }
    return (
        <span className={`relative z-10 flex items-center justify-center rounded-full bg-white ring-4 ring-white ${m.kind === 'approval' ? 'h-6 w-6 border-2 border-amber-300 text-amber-500' : 'h-4 w-4 border-2 border-slate-300'}`}>
            {m.kind === 'approval' && <Flag className="h-3 w-3" />}
        </span>
    );
}

