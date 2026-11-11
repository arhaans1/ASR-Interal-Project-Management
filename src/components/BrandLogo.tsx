import Image from 'next/image';

// The ASR Media Pro logo. Two files, picked by the surface they sit on:
//  - 'light': black mark on a transparent background, for white and light surfaces
//  - 'dark':  white mark on a black circle, for dark surfaces
const FILES = {
    light: '/brand/asr-logo-light-theme.png',
    dark: '/brand/asr-logo-dark-theme.png',
};

export default function BrandLogo({
    theme,
    size,
    className = '',
    priority = false,
}: {
    theme: 'light' | 'dark';
    size: number;
    className?: string;
    priority?: boolean;
}) {
    return (
        <Image
            src={FILES[theme]}
            alt="ASR Media Pro"
            width={size}
            height={size}
            priority={priority}
            className={`shrink-0 select-none object-contain ${className}`}
            draggable={false}
        />
    );
}
