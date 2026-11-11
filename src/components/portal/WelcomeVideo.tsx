'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { BUNNY_PLAYERJS_URL, UNLOCK_AFTER_SECONDS, WELCOME_VIDEO_URL } from '@/lib/welcomeVideo';

// Full-screen welcome video. When `mustFinish` is set the client cannot close it or
// continue until the video has played to the end.

declare global {
    interface Window {
        playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJsPlayer };
    }
}
interface PlayerJsPlayer {
    on: (event: string, handler: (data?: any) => void) => void;
}

interface WelcomeVideoProps {
    firstName?: string;
    mustFinish: boolean;
    onFinish: () => void;
    onClose?: () => void;
}

function loadPlayerJs(): Promise<void> {
    if (typeof window === 'undefined') return Promise.reject();
    if (window.playerjs) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${BUNNY_PLAYERJS_URL}"]`);
        const script = existing ?? document.createElement('script');
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject());
        if (!existing) {
            script.src = BUNNY_PLAYERJS_URL;
            script.async = true;
            document.head.appendChild(script);
        }
    });
}

export default function WelcomeVideo({ firstName, mustFinish, onFinish, onClose }: WelcomeVideoProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [finished, setFinished] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    // Continue also opens UNLOCK_AFTER_SECONDS after play was pressed (or after the pop-up
    // opened, if the player cannot be tracked), so nobody is locked in.
    const [timeUp, setTimeUp] = useState(false);
    const [untracked, setUntracked] = useState(false);

    // Hear when the video plays and ends
    useEffect(() => {
        let cancelled = false;
        let readySeen = false;
        let playTimer: number | undefined;

        const openTimer = window.setTimeout(() => {
            if (!readySeen && !cancelled) { setUntracked(true); setTimeUp(true); }
        }, UNLOCK_AFTER_SECONDS * 1000);

        loadPlayerJs()
            .then(() => {
                const iframe = iframeRef.current;
                if (cancelled || !iframe || !window.playerjs) return;
                const player = new window.playerjs.Player(iframe);
                player.on('ready', () => {
                    readySeen = true;
                    setPlayerReady(true);
                    player.on('play', () => {
                        if (playTimer === undefined) playTimer = window.setTimeout(() => setTimeUp(true), UNLOCK_AFTER_SECONDS * 1000);
                    });
                    player.on('ended', () => setFinished(true));
                    // Some players stop a hair before the end; treat the last 2% as watched
                    player.on('timeupdate', (data?: { seconds?: number; duration?: number }) => {
                        if (data?.duration && data.seconds && data.seconds / data.duration >= 0.98) setFinished(true);
                    });
                });
            })
            .catch(() => { /* untracked: the timer started when the pop-up opened will unlock it */ });

        return () => {
            cancelled = true;
            window.clearTimeout(openTimer);
            window.clearTimeout(playTimer);
        };
    }, []);

    // Escape closes it, unless it has to be watched
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !mustFinish && onClose) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mustFinish, onClose]);

    // Keep the page behind from scrolling
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, []);

    const canContinue = !mustFinish || finished || timeUp;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Welcome video"
            className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-slate-950"
        >
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />

            <header className="relative flex items-center justify-between px-4 py-4 sm:px-8">
                <div className="flex items-center gap-2.5">
                    <BrandLogo theme="dark" size={36} className="h-9 w-9 rounded-full ring-1 ring-white/20" />
                    <span className="text-sm font-semibold text-white/80">ASR Media Pro</span>
                </div>
                {!mustFinish && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close video"
                        className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </header>

            <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-8 sm:px-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Welcome</p>
                <h1 className="mt-1.5 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {firstName ? `${firstName}, welcome to ASR Media Pro` : 'Welcome to ASR Media Pro'}
                </h1>
                <p className="mt-2 max-w-xl text-center text-sm text-slate-300 sm:text-base">
                    {mustFinish
                        ? 'Watch this short video to see how we will work together. Your onboarding opens as soon as it ends.'
                        : 'A quick look at how we work together.'}
                </p>

                {/* As wide as fits, but never so tall that the button below leaves the screen */}
                <div
                    className="mt-5 w-full overflow-hidden rounded-2xl bg-black shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10"
                    style={{ maxWidth: 'min(100%, calc((100vh - 21rem) * 1.7778))', minWidth: 'min(100%, 18rem)' }}
                >
                    <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                        <iframe
                            ref={iframeRef}
                            src={WELCOME_VIDEO_URL}
                            title="Welcome to ASR Media Pro"
                            loading="eager"
                            allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen;"
                            allowFullScreen
                            style={{ border: 0, position: 'absolute', top: 0, height: '100%', width: '100%' }}
                        />
                    </div>
                </div>

                <div className="mt-5 flex min-h-[3.5rem] flex-col items-center gap-2">
                    <button
                        type="button"
                        disabled={!canContinue}
                        onClick={onFinish}
                        className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold transition-all sm:text-base ${canContinue
                            ? 'bg-white text-slate-950 shadow-lg hover:bg-slate-100'
                            : 'cursor-not-allowed bg-white/10 text-white/40'
                            }`}
                    >
                        {finished ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : null}
                        {mustFinish ? 'Continue to onboarding' : 'Close'}
                        {canContinue && <ArrowRight className="h-4 w-4" />}
                    </button>
                    {mustFinish && !canContinue && (
                        <p className="flex items-center gap-2 text-xs text-slate-400">
                            {!playerReady && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Opens when the video finishes
                        </p>
                    )}
                    {mustFinish && untracked && !finished && (
                        <p className="text-xs text-slate-400">You can continue now. Please do watch the full video.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
