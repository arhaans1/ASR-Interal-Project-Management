'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Copy, FolderOpen, Info } from 'lucide-react';
import { PortalClient, Task } from '@/types/database';
import { guideFor, StepAction, toEmbedUrl } from '@/lib/funnelTemplates';

interface StepDetailProps {
    task: Task;
    client: PortalClient;
}

const linkFor = (action: StepAction, client: PortalClient): string | null => {
    if (action.url) return action.url;
    if (action.source === 'drive') return client.drive_folder_url;
    // The assets folder, or the main Drive folder for cards that do not have one set
    if (action.source === 'assets') return client.assets_folder_url || client.drive_folder_url;
    if (action.source === 'video') return client.onboarding_video_url;
    if (action.source === 'form') return client.onboarding_form_url;
    return null;
};

// The guidance shown for one client task: what to do, where it goes and the links to do it.
export default function StepDetail({ task, client }: StepDetailProps) {
    const guide = guideFor(task.task_key);
    const [copied, setCopied] = useState(false);

    const embedUrl = guide.embedVideo ? toEmbedUrl(client.onboarding_video_url) : null;
    const actions = (guide.actions || [])
        .map((action) => ({
            ...action,
            href: linkFor(action, client),
            label: action.source === 'assets' && !client.assets_folder_url ? 'Open your Drive folder' : action.label,
        }))
        // The embedded player already covers the main action; keep "open in a new tab" as a fallback.
        .filter((action) => action.href);
    const missingLink = (guide.actions || []).some((a) => a.primary && !linkFor(a, client));

    const copy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard can be blocked; the value stays visible to copy by hand.
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-[15px] leading-relaxed text-slate-600">{guide.summary}</p>

            {guide.embedVideo && (
                embedUrl ? (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-900/10 shadow-lg">
                        <iframe
                            src={embedUrl}
                            title="Start Here video"
                            className="h-full w-full"
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            allowFullScreen
                        />
                    </div>
                ) : null
            )}

            {guide.bullets && (
                guide.numbered ? (
                    <ol className="space-y-2.5">
                        {guide.bullets.map((line, i) => (
                            <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{line}</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <ul className="space-y-2">
                        {guide.bullets.map((line, i) => (
                            <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                )
            )}

            {guide.copyValue && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{guide.copyValue.label}</p>
                        <p className="mt-0.5 truncate font-mono text-base font-semibold tracking-wide text-slate-900">
                            {guide.copyValue.value}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => copy(guide.copyValue!.value)}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            )}

            {guide.where && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                        Where it goes: <span className="font-semibold text-slate-900">{guide.where}</span>
                    </span>
                </div>
            )}

            {guide.note && (
                <div className="flex gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200/70">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{guide.note}</span>
                </div>
            )}

            {missingLink && (
                <div className="flex gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>Your project manager will share this link with you shortly.</span>
                </div>
            )}

            {actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                        <a
                            key={action.label}
                            href={action.href!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${action.primary
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {action.label}
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
