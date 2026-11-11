'use client';

import { LayoutGrid, UserCog } from 'lucide-react';

// Operators have two workspaces and move between them here.
export default function WorkspaceSwitcher({ current }: { current: 'team' | 'operator' }) {
    const options = [
        { id: 'team', label: 'Team', href: '/', icon: LayoutGrid },
        { id: 'operator', label: 'My clients', href: '/operator', icon: UserCog },
    ] as const;

    return (
        <nav className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" aria-label="Switch workspace">
            {options.map((option) => {
                const active = option.id === current;
                return (
                    <a
                        key={option.id}
                        href={option.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${active
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                            : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                    </a>
                );
            })}
        </nav>
    );
}
