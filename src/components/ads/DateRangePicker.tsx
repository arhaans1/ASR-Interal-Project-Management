'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    addDays,
    addMonths,
    endOfMonth,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateSelection, formatRange, PRESETS, presetLabel, presetRange, toISODate } from '@/lib/adMetrics';

interface DateRangePickerProps {
    value: DateSelection;
    // The dates actually covered, for Lifetime (known once the report has loaded)
    resolved?: { since: string; until: string } | null;
    onChange: (value: DateSelection) => void;
    tone?: 'light' | 'dark';
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function DateRangePicker({ value, resolved, onChange, tone = 'light' }: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [start, setStart] = useState<Date | null>(null);
    const [end, setEnd] = useState<Date | null>(null);
    const [hover, setHover] = useState<Date | null>(null);
    const [month, setMonth] = useState(() => startOfMonth(new Date()));
    const rootRef = useRef<HTMLDivElement>(null);
    const today = startOfDay(new Date());

    // Opening starts from the current selection.
    useEffect(() => {
        if (!open) return;
        const s = value.since ? parseISO(value.since) : resolved?.since ? parseISO(resolved.since) : null;
        const e = value.until ? parseISO(value.until) : resolved?.until ? parseISO(resolved.until) : null;
        setStart(s);
        setEnd(e);
        setHover(null);
        // Show the end of the range in the right-hand month.
        setMonth(startOfMonth(subMonths(e ?? today, 1)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const choosePreset = (id: (typeof PRESETS)[number]['id']) => {
        onChange(presetRange(id));
        setOpen(false);
    };

    const chooseDay = (day: Date) => {
        if (!start || end) {
            setStart(day);
            setEnd(null);
        } else if (isBefore(day, start)) {
            setStart(day);
        } else {
            setEnd(day);
        }
    };

    const apply = () => {
        if (!start) return;
        const last = end ?? start;
        onChange({ preset: 'custom', since: toISODate(start), until: toISODate(last) });
        setOpen(false);
    };

    const shownRange = value.preset === 'maximum' ? (resolved ? formatRange(resolved.since, resolved.until) : '') : formatRange(value.since, value.until);
    const previewEnd = end ?? (start && hover && !isBefore(hover, start) ? hover : null);

    const dark = tone === 'dark';

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={`group flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-sm font-semibold shadow-sm transition-all ${dark
                    ? 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15'
                    : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-slate-300'
                    }`}
            >
                <CalendarDays className={`h-4 w-4 shrink-0 ${dark ? 'text-indigo-300' : 'text-indigo-600'}`} />
                <span className="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-center sm:gap-2">
                    <span className="whitespace-nowrap">{presetLabel(value.preset)}</span>
                    {shownRange && (
                        <span className={`truncate text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
                            <span className="hidden sm:inline">· </span>
                            {shownRange}
                        </span>
                    )}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${dark ? 'text-slate-300' : 'text-slate-400'}`} />
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Choose a date range"
                    className="animate-in fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-900/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[680px]"
                >
                    <div className="flex flex-col sm:flex-row">
                        {/* Presets */}
                        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 sm:w-44 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3">
                            {PRESETS.map((p) => {
                                const active = value.preset === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => choosePreset(p.id)}
                                        className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Calendars */}
                        <div className="flex-1 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setMonth((m) => subMonths(m, 1))}
                                    aria-label="Previous month"
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMonth((m) => addMonths(m, 1))}
                                    disabled={!isBefore(addMonths(month, 1), startOfMonth(today))}
                                    aria-label="Next month"
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                {[month, addMonths(month, 1)].map((m, i) => (
                                    <Month
                                        key={m.toISOString()}
                                        month={m}
                                        className={i === 0 ? 'hidden sm:block' : ''}
                                        today={today}
                                        start={start}
                                        end={previewEnd}
                                        onPick={chooseDay}
                                        onHover={setHover}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-slate-600">
                            {start
                                ? formatRange(toISODate(start), toISODate(end ?? start))
                                : 'Pick a start date'}
                            {start && !end && <span className="text-slate-400"> · now pick an end date</span>}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-900 sm:flex-none"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={apply}
                                disabled={!start}
                                className="flex-1 rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40 sm:flex-none"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Month({
    month,
    today,
    start,
    end,
    onPick,
    onHover,
    className = '',
}: {
    month: Date;
    today: Date;
    start: Date | null;
    end: Date | null;
    onPick: (day: Date) => void;
    onHover: (day: Date | null) => void;
    className?: string;
}) {
    const days = useMemo(() => {
        const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
        const last = endOfMonth(month);
        const out: Date[] = [];
        for (let d = first; !isAfter(d, last) || out.length % 7 !== 0; d = addDays(d, 1)) out.push(d);
        return out;
    }, [month]);

    return (
        <div className={className} onMouseLeave={() => onHover(null)}>
            <p className="mb-3 text-center text-sm font-bold text-slate-900">{format(month, 'MMMM yyyy')}</p>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {WEEKDAYS.map((d) => (
                    <span key={d} className="pb-2">{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {days.map((day) => {
                    if (!isSameMonth(day, month)) return <span key={day.toISOString()} />;
                    const future = isAfter(day, today);
                    const isStart = start && isSameDay(day, start);
                    const isEnd = end && isSameDay(day, end);
                    const inRange = start && end && isAfter(day, start) && isBefore(day, end);
                    const edge = isStart || isEnd;
                    const rangeBg =
                        start && end && !isSameDay(start, end)
                            ? isStart
                                ? 'bg-gradient-to-r from-transparent from-50% to-indigo-50 to-50%'
                                : isEnd
                                    ? 'bg-gradient-to-l from-transparent from-50% to-indigo-50 to-50%'
                                    : inRange
                                        ? 'bg-indigo-50'
                                        : ''
                            : '';
                    return (
                        <div key={day.toISOString()} className={`flex justify-center ${rangeBg}`}>
                            <button
                                type="button"
                                disabled={future}
                                onClick={() => onPick(day)}
                                onMouseEnter={() => onHover(day)}
                                aria-pressed={Boolean(edge)}
                                aria-label={format(day, 'd MMMM yyyy')}
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${edge
                                    ? 'bg-indigo-600 font-bold text-white shadow-sm'
                                    : inRange
                                        ? 'font-semibold text-indigo-800 hover:bg-indigo-100'
                                        : future
                                            ? 'cursor-not-allowed text-slate-300'
                                            : 'font-medium text-slate-700 hover:bg-slate-100'
                                    } ${isSameDay(day, today) && !edge ? 'ring-1 ring-indigo-300' : ''}`}
                            >
                                {format(day, 'd')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
