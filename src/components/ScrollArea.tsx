'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Hand } from 'lucide-react';

interface ScrollAreaProps {
    children: ReactNode;
    className?: string; // classes for the scrolling element (padding etc.)
    hint?: string; // shown until the viewer scrolls once
    // Where to start, as a fraction of the content width (e.g. the current milestone's position)
    focusFraction?: number;
}

// A sideways-scrolling area that tells people it scrolls: soft fades at the edges that have
// more content, round arrow buttons, and a one-off "swipe" hint with a small animation.
export default function ScrollArea({ children, className = '', hint = 'Swipe to see more', focusFraction }: ScrollAreaProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ left: false, right: false });
    const [scrolled, setScrolled] = useState(false);

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (focusFraction !== undefined && el.scrollWidth > el.clientWidth) {
            el.scrollLeft = Math.max(0, el.scrollWidth * focusFraction - el.clientWidth / 2);
        }
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [measure, focusFraction]);

    const nudge = (dir: 1 | -1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
    };

    const overflowing = edges.left || edges.right;

    return (
        <div className="relative">
            <div
                ref={ref}
                onScroll={() => {
                    measure();
                    if (!scrolled) setScrolled(true);
                }}
                className={`overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
            >
                {children}
            </div>

            {/* Fades on the sides that have more */}
            <div className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent transition-opacity ${edges.left ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent transition-opacity ${edges.right ? 'opacity-100' : 'opacity-0'}`} />

            {edges.left && (
                <button
                    type="button"
                    onClick={() => nudge(-1)}
                    aria-label="Scroll left"
                    className="absolute left-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-white"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
            )}
            {edges.right && (
                <button
                    type="button"
                    onClick={() => nudge(1)}
                    aria-label="Scroll right"
                    className="absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-white"
                >
                    <ChevronRight className="h-4 w-4 animate-[nudge-x_1.4s_ease-in-out_infinite]" />
                </button>
            )}

            {overflowing && !scrolled && (
                <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
                    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900/85 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur">
                        <Hand className="h-3.5 w-3.5 animate-[nudge-x_1.4s_ease-in-out_infinite]" />
                        {hint}
                    </span>
                </div>
            )}
        </div>
    );
}
