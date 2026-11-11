'use client';
import BrandLogo from '@/components/BrandLogo';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    CalendarCheck,
    Check,
    ChevronLeft,
    Clapperboard,
    CreditCard,
    FileText,
    FolderOpen,
    Globe,
    GraduationCap,
    Image as ImageIcon,
    LayoutTemplate,
    Megaphone,
    MessageCircle,
    Mic,
    Pause,
    PenLine,
    Play,
    PlayCircle,
    Presentation,
    Rocket,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    Target,
    Users,
    Video,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { FunnelType } from '@/types/database';
import { buildWalkthrough, sceneDuration, voiceoverUrl, WalkthroughScene } from '@/lib/walkthrough';

interface WelcomeWalkthroughProps {
    firstName: string;
    funnelType?: FunnelType | null;
    // The client has to watch it through once. Later viewings can be closed at any time.
    mustFinish: boolean;
    onFinish: () => void;
    onClose?: () => void;
}

type IconType = typeof Check;

const ONBOARDING_ICONS: IconType[] = [PlayCircle, FolderOpen, FileText, Sparkles, ImageIcon, Megaphone, CreditCard, Globe];
const RESEARCH_ICONS: IconType[] = [BarChart3, Users, Target];
const iconForBuild = (label: string): IconType =>
    /deck/i.test(label) ? Presentation
        : /bonus/i.test(label) ? Sparkles
            : /script/i.test(label) ? PenLine
                : /image/i.test(label) ? ImageIcon
                    : /community|lms/i.test(label) ? Users
                        : /zoom|calendar/i.test(label) ? CalendarCheck
                            : /form/i.test(label) ? FileText
                                : /nurture/i.test(label) ? MessageCircle
                                    : LayoutTemplate;
const iconForRecording = (label: string): IconType =>
    /course/i.test(label) ? GraduationCap : /ads/i.test(label) ? Clapperboard : Video;
const MODEL_ICONS: Record<string, IconType> = {
    'Low-ticket course': BookOpen,
    Community: Users,
    'High-ticket programme': Rocket,
    Ad: Megaphone,
    'Landing page': LayoutTemplate,
    VSL: Video,
    Webinar: Presentation,
    Sale: CreditCard,
    'Booked call': CalendarCheck,
};

// Each piece of a scene rises in, one after another.
const rise = (step: number, extra = '') => ({
    className: `wt-rise ${extra}`,
    style: { animationDelay: `${step * 0.16 + 0.15}s` },
});

function SceneVisual({ scene, firstName }: { scene: WalkthroughScene; firstName: string }) {
    const items = scene.items ?? [];

    switch (scene.kind) {
        case 'welcome':
            return (
                <div className="flex flex-col items-center text-center">
                    <div {...rise(0, 'h-24 w-24 overflow-hidden rounded-full shadow-2xl shadow-indigo-500/30 ring-1 ring-white/15')}><BrandLogo theme="dark" size={96} className="h-24 w-24" /></div>
                    <h2 {...rise(1, 'mt-8 text-4xl font-bold leading-tight tracking-tight sm:text-6xl')}>
                        Welcome to ASR Media Pro{firstName ? `, ${firstName}` : ''}.
                    </h2>
                </div>
            );

        case 'model':
            return (
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-2">
                    {items.map((label, i) => {
                        const Icon = MODEL_ICONS[label] ?? Sparkles;
                        const last = i === items.length - 1;
                        return (
                            <div key={label} className="flex flex-col items-center gap-3 sm:flex-row sm:gap-2">
                                <div {...rise(i * 2, `flex w-full items-center gap-3 rounded-2xl px-5 py-4 ring-1 sm:w-auto sm:flex-col sm:px-7 sm:py-6 sm:text-center ${last ? 'bg-indigo-500 ring-indigo-300/50 shadow-xl shadow-indigo-500/30' : 'bg-white/[0.07] ring-white/15'}`)}>
                                    <Icon className="h-7 w-7 shrink-0" />
                                    <span className="text-base font-semibold sm:text-lg">{label}</span>
                                </div>
                                {!last && <ArrowRight {...rise(i * 2 + 1, 'h-6 w-6 shrink-0 rotate-90 text-indigo-300 sm:rotate-0')} />}
                            </div>
                        );
                    })}
                </div>
            );

        case 'onboarding':
            return (
                <ul className="grid gap-1.5 sm:grid-cols-2 sm:gap-2.5">
                    {items.map((label, i) => {
                        const Icon = ONBOARDING_ICONS[i] ?? Check;
                        return (
                            <li key={label} {...rise(i, 'flex items-center gap-3 rounded-xl bg-white/[0.07] px-3 py-2 ring-1 ring-white/15 sm:rounded-2xl sm:px-4 sm:py-3')}>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-indigo-200 sm:h-9 sm:w-9 sm:rounded-xl">
                                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                </span>
                                <span className="min-w-0 flex-1 text-left text-sm font-semibold sm:text-base">{label}</span>
                                <span className="wt-pop flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950" style={{ animationDelay: `${i * 0.16 + 1.1}s` }}>
                                    <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                                </span>
                            </li>
                        );
                    })}
                </ul>
            );

        case 'call':
            return (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                    <div {...rise(0, 'flex items-center gap-3 rounded-2xl bg-emerald-400/15 px-5 py-4 text-emerald-200 ring-1 ring-emerald-300/30')}>
                        <ShieldCheck className="h-7 w-7" />
                        <span className="text-lg font-semibold">Onboarding complete</span>
                    </div>
                    <ArrowRight {...rise(1, 'h-6 w-6 rotate-90 text-indigo-300 sm:rotate-0')} />
                    <div {...rise(2, 'flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-slate-950 shadow-xl shadow-indigo-500/30')}>
                        <Video className="h-7 w-7 text-indigo-600" />
                        <span className="text-lg font-bold">Welcome call</span>
                    </div>
                    <ArrowRight {...rise(3, 'h-6 w-6 rotate-90 text-indigo-300 sm:rotate-0')} />
                    <div {...rise(4, 'flex items-center gap-3 rounded-2xl bg-indigo-500 px-5 py-4 shadow-xl shadow-indigo-500/30')}>
                        <Rocket className="h-7 w-7" />
                        <span className="text-lg font-semibold">Work begins</span>
                    </div>
                </div>
            );

        case 'research':
            return (
                <div className="flex flex-col items-center gap-5">
                    <div className="grid w-full gap-3 sm:grid-cols-3">
                        {items.map((label, i) => {
                            const Icon = RESEARCH_ICONS[i] ?? Search;
                            return (
                                <div key={label} {...rise(i, 'flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-4 ring-1 ring-white/15 sm:flex-col sm:py-6 sm:text-center')}>
                                    <Icon className="h-7 w-7 shrink-0 text-indigo-200" />
                                    <span className="text-base font-semibold">{label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <ArrowRight {...rise(3, 'h-6 w-6 rotate-90 text-indigo-300')} />
                    <div {...rise(4, 'flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-slate-950 shadow-xl shadow-indigo-500/30')}>
                        <FileText className="h-6 w-6 text-indigo-600" />
                        <span className="text-base font-bold sm:text-lg">{scene.note}</span>
                    </div>
                </div>
            );

        case 'build':
            return (
                <ul className="flex flex-wrap justify-center gap-2.5">
                    {items.map((label, i) => {
                        const Icon = iconForBuild(label);
                        return (
                            <li key={label} {...rise(i, 'flex items-center gap-2.5 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/15')}>
                                <Icon className="h-5 w-5 text-indigo-200" />
                                <span className="text-sm font-semibold sm:text-base">{label}</span>
                            </li>
                        );
                    })}
                </ul>
            );

        case 'record':
            return (
                <div className="flex flex-col items-center gap-6">
                    <div className="grid w-full gap-3 sm:auto-cols-fr sm:grid-flow-col">
                        {items.map((label, i) => {
                            const Icon = iconForRecording(label);
                            return (
                                <div key={label} {...rise(i, 'flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-slate-950 shadow-xl shadow-indigo-500/20 sm:flex-col sm:py-6 sm:text-center')}>
                                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                                        <Icon className="h-5 w-5" />
                                        <span className="wt-blink absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                                    </span>
                                    <span className="text-base font-bold">{label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p {...rise(items.length + 1, 'flex items-center gap-2 text-center text-sm font-medium text-indigo-100 sm:text-base')}>
                        <Mic className="h-4 w-4 shrink-0" />
                        {scene.note}
                    </p>
                </div>
            );

        case 'timeline':
            return (
                <div className="w-full">
                    <ol className="relative grid gap-3 sm:grid-cols-6 sm:gap-0">
                        {/* The track fills from left to right as the milestones land */}
                        <span className="absolute left-0 right-0 top-[18px] hidden h-1 rounded-full bg-white/10 sm:block" />
                        <span className="wt-grow absolute left-0 top-[18px] hidden h-1 rounded-full bg-emerald-400 sm:block" />
                        {items.map((label, i) => {
                            const [name, time] = label.split(' · ');
                            const last = i === items.length - 1;
                            return (
                                <li key={label} {...rise(i * 1.5, 'relative flex items-center gap-3 sm:flex-col sm:gap-3 sm:text-center')}>
                                    <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-4 ring-slate-950 ${last ? 'bg-emerald-400 text-slate-950' : 'bg-white text-slate-950'}`}>
                                        {last ? <Rocket className="h-5 w-5" /> : i + 1}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-bold sm:text-base">{name}</span>
                                        {time && <span className="block text-xs font-semibold text-emerald-300 sm:text-sm">{time}</span>}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            );

        case 'questions':
            return (
                <div className="flex flex-col items-center gap-6 text-center">
                    <div {...rise(0, 'flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-500/30')}>
                        <MessageCircle className="h-10 w-10" />
                    </div>
                    <p {...rise(1, 'max-w-md text-lg font-medium text-indigo-100')}>Our team is there Monday to Friday, 10 AM to 6 PM.</p>
                </div>
            );

        default:
            return null;
    }
}

export default function WelcomeWalkthrough({ firstName, funnelType, mustFinish, onFinish, onClose }: WelcomeWalkthroughProps) {
    const walkthrough = useMemo(() => buildWalkthrough(funnelType), [funnelType]);
    const scenes = walkthrough.scenes;

    const [started, setStarted] = useState(false);
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0..1 within the current scene
    const [finished, setFinished] = useState(false);
    const [hasAudio, setHasAudio] = useState(false);
    const [muted, setMuted] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const elapsedRef = useRef(0);
    const scene = scenes[index];
    const isLast = index === scenes.length - 1;

    // Is there a recorded voiceover for this walkthrough?
    useEffect(() => {
        let cancelled = false;
        fetch(voiceoverUrl(walkthrough.variant, 0), { method: 'HEAD' })
            .then((res) => {
                if (!cancelled) setHasAudio(res.ok && (res.headers.get('content-type') || '').startsWith('audio'));
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [walkthrough.variant]);

    const goTo = useCallback((next: number) => {
        elapsedRef.current = 0;
        setProgress(0);
        setIndex(next);
    }, []);

    const advance = useCallback(() => {
        if (index >= scenes.length - 1) {
            setPlaying(false);
            setFinished(true);
            setProgress(1);
        } else {
            goTo(index + 1);
        }
    }, [index, scenes.length, goTo]);

    // Voiceover: one clip per scene. The scene moves on when its clip ends.
    useEffect(() => {
        if (!started || !hasAudio) return;
        const audio = new Audio(voiceoverUrl(walkthrough.variant, index));
        audio.muted = muted;
        audioRef.current = audio;
        const onTime = () => { if (audio.duration) setProgress(Math.min(1, audio.currentTime / audio.duration)); };
        const onEnded = () => advance();
        // A missing or broken clip falls back to the timer for this scene.
        const onError = () => { audioRef.current = null; };
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        if (playing) audio.play().catch(() => { audioRef.current = null; });
        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            if (audioRef.current === audio) audioRef.current = null;
        };
        // `playing` and `muted` are handled by the effects below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started, hasAudio, index, walkthrough.variant]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) audio.play().catch(() => { });
        else audio.pause();
    }, [playing]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = muted;
    }, [muted]);

    // No voiceover clip: the scene runs on a timer sized to its caption.
    useEffect(() => {
        if (!started || !playing || finished) return;
        let frame = 0;
        let last = performance.now();
        const duration = sceneDuration(scene);
        const tick = (now: number) => {
            if (!audioRef.current) {
                elapsedRef.current += now - last;
                if (elapsedRef.current >= duration) {
                    advance();
                    return;
                }
                setProgress(elapsedRef.current / duration);
            }
            last = now;
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [started, playing, finished, scene, advance]);

    const start = () => {
        setStarted(true);
        setPlaying(true);
    };

    const replay = () => {
        setFinished(false);
        goTo(0);
        setPlaying(true);
    };

    const back = () => {
        if (index === 0) return;
        setFinished(false);
        goTo(index - 1);
        setPlaying(true);
    };

    // Space pauses and resumes, Escape closes when closing is allowed
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === ' ' && started && !finished) {
                e.preventDefault();
                setPlaying((p) => !p);
            }
            if (e.key === 'Escape' && !mustFinish && onClose) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [started, finished, mustFinish, onClose]);

    const totalSeconds = Math.round(scenes.reduce((sum, s) => sum + sceneDuration(s), 0) / 1000);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Welcome walkthrough"
            className={`fixed inset-0 z-[200] flex flex-col overflow-hidden bg-slate-950 text-white ${playing ? '' : 'wt-paused'}`}
        >
            {/* Backdrop glow */}
            <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-indigo-600/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-48 right-0 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-3xl" />

            {/* Top: progress through the scenes */}
            <div className="relative z-10 px-4 pt-4 sm:px-8 sm:pt-6">
                <div className="flex gap-1.5" aria-hidden>
                    {scenes.map((s, i) => (
                        <div key={s.kind} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                            <div
                                className="h-full rounded-full bg-white"
                                style={{ width: `${(i < index || finished ? 1 : i === index ? progress : 0) * 100}%` }}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <BrandLogo theme="dark" size={32} className="h-8 w-8 rounded-full ring-1 ring-white/20" />
                        <span className="text-sm font-semibold text-white/80">ASR Media Pro</span>
                    </div>
                    {!mustFinish && onClose && (
                        <button type="button" onClick={onClose} aria-label="Close walkthrough" className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Stage */}
            <div className="relative z-10 flex flex-1 justify-center overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
                {!started ? (
                    <div className="my-auto flex max-w-xl flex-col items-center text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Start here</p>
                        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                            {firstName ? `${firstName}, welcome` : 'Welcome'} to ASR Media Pro
                        </h1>
                        <p className="mt-4 text-lg leading-relaxed text-slate-300">
                            A quick walkthrough of how we will build your {walkthrough.name} together, and what we need from you.
                        </p>
                        <button
                            type="button"
                            onClick={start}
                            autoFocus
                            className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-lg font-bold text-slate-950 shadow-2xl shadow-indigo-500/30 transition-transform hover:scale-[1.03]"
                        >
                            <Play className="h-5 w-5 fill-slate-950" />
                            Play walkthrough
                        </button>
                        <p className="mt-4 text-sm text-slate-400">About {Math.round(totalSeconds / 10) * 10} seconds</p>
                    </div>
                ) : (
                    // The key restarts every animation when the scene changes
                    <div key={`${index}-${finished ? 'end' : 'run'}`} className="my-auto w-full max-w-4xl">
                        <p {...rise(0, 'text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-300')}>{scene.eyebrow}</p>
                        {scene.kind !== 'welcome' && (
                            <h2 {...rise(0.5, 'mx-auto mt-3 max-w-3xl text-center text-3xl font-bold leading-tight tracking-tight sm:text-5xl')}>{scene.title}</h2>
                        )}
                        {scene.badge && (
                            <div className="mt-4 flex justify-center">
                                <span {...rise(1, 'inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-1.5 text-sm font-bold text-emerald-200 ring-1 ring-emerald-300/30')}>
                                    <CalendarCheck className="h-4 w-4" />
                                    {scene.badge}
                                </span>
                            </div>
                        )}
                        <div className="mt-5 sm:mt-10">
                            <SceneVisual scene={scene} firstName={firstName} />
                        </div>
                        {scene.kind === 'timeline' && scene.note && (
                            <p {...rise(10, 'mt-8 text-center text-sm font-medium text-indigo-100 sm:text-base')}>{scene.note}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom: the spoken line as a caption, and the controls */}
            {started && (
                <div className="relative z-10 border-t border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur sm:px-8">
                    <p aria-live="polite" className="mx-auto min-h-[3.25rem] max-w-3xl text-center text-[13px] leading-snug text-slate-200 sm:text-base sm:leading-relaxed">
                        {scene.voiceover}
                    </p>
                    <div className="mx-auto mt-3 flex max-w-3xl items-center justify-between gap-3">
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={back} disabled={index === 0} aria-label="Previous scene" className="rounded-full p-2.5 text-white/80 hover:bg-white/10 disabled:opacity-30">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            {finished ? (
                                <button type="button" onClick={replay} aria-label="Play again" className="rounded-full p-2.5 text-white/80 hover:bg-white/10">
                                    <RotateCcw className="h-5 w-5" />
                                </button>
                            ) : (
                                <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20">
                                    {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                                </button>
                            )}
                            {hasAudio && (
                                <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} className="rounded-full p-2.5 text-white/80 hover:bg-white/10">
                                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </button>
                            )}
                            <span className="ml-2 text-xs font-semibold tabular-nums text-white/50">{index + 1} / {scenes.length}</span>
                        </div>

                        <button
                            type="button"
                            onClick={onFinish}
                            disabled={mustFinish && !finished}
                            title={mustFinish && !finished ? 'Available once the walkthrough has finished' : undefined}
                            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all sm:text-base ${finished || !mustFinish
                                ? 'bg-white text-slate-950 hover:scale-[1.03]'
                                : 'cursor-not-allowed bg-white/10 text-white/40'
                                } ${finished && isLast ? 'shadow-2xl shadow-indigo-500/40' : ''}`}
                        >
                            {mustFinish ? 'Start my onboarding' : 'Done'}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
