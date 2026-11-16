import type { ReactNode } from 'react';

// The white card every ad performance section sits in.
export default function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="min-w-0 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}
