'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, WorkspaceSettings } from '@/lib/sections';

// The signed-in team member and the workspace settings, shared by the sidebar,
// the client form and Team Settings. One copy is kept for the whole page.

export interface CurrentUser {
    userId: string;
    username: string;
    role: 'admin' | 'operator' | 'client';
    isAdmin: boolean;
    isOperator: boolean;
    boardId: string | null;
}

interface WorkspaceState {
    user: CurrentUser | null;
    settings: WorkspaceSettings;
    ready: boolean;
}

let state: WorkspaceState = { user: null, settings: DEFAULT_SETTINGS, ready: false };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (next: Partial<WorkspaceState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
};

async function load() {
    try {
        const [me, settings] = await Promise.all([
            fetch('/api/auth/me').then((res) => (res.ok ? res.json() : null)),
            fetch('/api/settings').then((res) => (res.ok ? res.json() : null)),
        ]);
        publish({ user: me?.user ?? null, settings: settings?.sections ? settings : DEFAULT_SETTINGS, ready: true });
    } catch {
        publish({ ready: true });
    }
}

export function refreshWorkspace() {
    loading = load();
    return loading;
}

export async function saveWorkspaceSettings(settings: WorkspaceSettings): Promise<void> {
    const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Unable to save settings');
    publish({ settings: body });
}

export function useWorkspace(): WorkspaceState {
    const [, rerender] = useState(0);

    const onChange = useCallback(() => rerender((n) => n + 1), []);

    useEffect(() => {
        listeners.add(onChange);
        if (!loading) refreshWorkspace();
        return () => {
            listeners.delete(onChange);
        };
    }, [onChange]);

    return state;
}
