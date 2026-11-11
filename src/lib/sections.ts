// Sidebar sections. A client's `status` is the name of the section it sits in.

export interface SidebarSection {
    name: string;
    hidden: boolean;
}

export interface WorkspaceSettings {
    sections: SidebarSection[];
}

// These carry behaviour elsewhere in the app, so they can be hidden but not deleted:
// Active and Launched are the live projects (operator dashboard, AI connection),
// Team Members holds each person's task board, Archived is skipped when preloading.
export const BUILT_IN_SECTIONS = ['Active', 'Launched', 'Team Members', 'Archived'];

export const DEFAULT_SETTINGS: WorkspaceSettings = {
    sections: [
        { name: 'Active', hidden: false },
        { name: 'Launched', hidden: false },
        { name: 'Team Members', hidden: false },
        { name: 'Templates', hidden: false },
        { name: 'Archived', hidden: false },
    ],
};

export const MAX_SECTION_NAME = 40;

// Tidy whatever was stored or sent into a valid list: trimmed, no duplicates,
// and the built-in sections always present.
export function normalizeSettings(input: unknown): WorkspaceSettings {
    const raw = (input as any)?.sections;
    const sections: SidebarSection[] = [];
    const seen = new Set<string>();

    if (Array.isArray(raw)) {
        for (const item of raw) {
            const name = typeof item?.name === 'string' ? item.name.trim().slice(0, MAX_SECTION_NAME) : '';
            if (!name || seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());
            sections.push({ name, hidden: Boolean(item.hidden) });
        }
    }

    if (sections.length === 0) return { sections: DEFAULT_SETTINGS.sections.map((s) => ({ ...s })) };

    for (const name of BUILT_IN_SECTIONS) {
        if (!seen.has(name.toLowerCase())) sections.push({ name, hidden: false });
    }
    return { sections };
}
