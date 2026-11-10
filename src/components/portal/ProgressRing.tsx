interface ProgressRingProps {
    percent: number;
    size?: number;
    stroke?: number;
    trackClassName?: string;
    barClassName?: string;
    children?: React.ReactNode;
    label?: string;
}

// A circular progress meter. `children` sit in the middle.
export default function ProgressRing({
    percent,
    size = 120,
    stroke = 10,
    trackClassName = 'text-white/10',
    barClassName = 'text-emerald-400',
    children,
    label,
}: ProgressRingProps) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));

    return (
        <div
            className="relative shrink-0"
            style={{ width: size, height: size }}
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    className={trackClassName}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - clamped / 100)}
                    className={`${barClassName} transition-[stroke-dashoffset] duration-700 ease-out`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
        </div>
    );
}
