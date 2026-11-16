'use client';

import { useState } from 'react';

// A face for an operator. If a photo exists at /public/operators/<first-name>.png it is used;
// otherwise a cartoon avatar. Niladri and Arhaan have their own; anyone else gets initials.

const slugOf = (name: string) => name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');

function Cartoon({ who, initial }: { who: string; initial: string }) {
    const arhaan = who === 'arhaan';
    const niladri = who === 'niladri';

    if (!arhaan && !niladri) {
        return (
            <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
                <rect width="64" height="64" fill="#E0E7FF" />
                <text x="32" y="42" textAnchor="middle" fontSize="28" fontWeight="700" fill="#4F46E5" fontFamily="system-ui, sans-serif">{initial}</text>
            </svg>
        );
    }

    const skin = arhaan ? '#E3AE82' : '#D9A06B';
    const skinShade = arhaan ? '#CF9468' : '#C58853';
    const hair = arhaan ? '#1C1410' : '#201A16';
    return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
            <rect width="64" height="64" fill={arhaan ? '#DBEAFE' : '#FDE8D0'} />
            {/* shoulders and neck */}
            <path d="M6 64 Q8 47 32 47 Q56 47 58 64 Z" fill={arhaan ? '#4F46E5' : '#0F766E'} />
            <rect x="27" y="38" width="10" height="11" rx="3" fill={skinShade} />
            {/* ears and head */}
            <circle cx="19" cy="29" r="3.2" fill={skinShade} />
            <circle cx="45" cy="29" r="3.2" fill={skinShade} />
            <ellipse cx="32" cy="28" rx="13" ry="15" fill={skin} />

            {arhaan ? (
                <>
                    {/* spiky hair */}
                    <path d="M18.5 25 L16.5 13 L23 18 L24.5 7 L30 16 L34 5.5 L38.5 16 L44.5 8 L45.5 18.5 L49 13.5 L45.5 25.5 Q32 14.5 18.5 25 Z" fill={hair} />
                    {/* short beard */}
                    <path d="M19 30 Q19.5 46.5 32 46.5 Q44.5 46.5 45 30 Q44 38.5 32 38.5 Q20 38.5 19 30 Z" fill={hair} />
                    <path d="M28 41.5 Q32 44.5 36 41.5" stroke="#F4D3C0" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                </>
            ) : (
                <>
                    {/* neat short hair */}
                    <path d="M18.8 25 Q17 9.5 32 9.5 Q47 9.5 45.2 25 Q42 16.5 32 16.5 Q22 16.5 18.8 25 Z" fill={hair} />
                    {/* fuller beard and moustache */}
                    <path d="M18 28.5 Q16.5 53 32 53 Q47.5 53 46 28.5 Q44.5 36.5 38.5 35.5 Q32 33.5 25.5 35.5 Q19.5 36.5 18 28.5 Z" fill={hair} />
                    <path d="M28 42 Q32 45.5 36 42" stroke="#F4D3C0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </>
            )}

            {/* eyes and brows */}
            <circle cx="26.5" cy="26.5" r="1.8" fill="#1F2937" />
            <circle cx="37.5" cy="26.5" r="1.8" fill="#1F2937" />
            <path d="M23.5 22 Q26.5 20.5 29.5 22" stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M34.5 22 Q37.5 20.5 40.5 22" stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />

            {/* spectacles (Niladri) */}
            {niladri && (
                <g fill="rgba(255,255,255,0.28)" stroke="#111827" strokeWidth="1.5">
                    <circle cx="26.5" cy="26.5" r="5.2" />
                    <circle cx="37.5" cy="26.5" r="5.2" />
                    <path d="M31.7 26 H32.3" strokeLinecap="round" />
                    <path d="M21.3 25.5 L19.5 24.5 M42.7 25.5 L44.5 24.5" strokeLinecap="round" />
                </g>
            )}
            {/* nose */}
            <path d="M32 29 Q30.8 33 32.6 33.4" stroke={skinShade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
    );
}

export default function OperatorAvatar({ name, className = 'h-11 w-11' }: { name: string; className?: string }) {
    const who = slugOf(name);
    const [photoFailed, setPhotoFailed] = useState(false);

    return (
        <span className={`relative inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm ${className}`}>
            {!photoFailed && who ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={`/operators/${who}.png`}
                    alt={name}
                    className="absolute inset-0 z-10 h-full w-full object-cover"
                    onError={() => setPhotoFailed(true)}
                />
            ) : null}
            <Cartoon who={who} initial={(name.trim()[0] || '?').toUpperCase()} />
        </span>
    );
}
