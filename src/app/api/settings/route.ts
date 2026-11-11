import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminAccess, getTeamAccess } from '@/lib/access';
import { DEFAULT_SETTINGS, normalizeSettings } from '@/lib/sections';

const KEY = 'workspace';

// GET: workspace settings for the team. Falls back to the defaults when nothing is saved yet.
export async function GET() {
    if (!(await getTeamAccess())) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    const { data, error } = await supabase.from('workspace_settings').select('value').eq('key', KEY).maybeSingle();
    if (error || !data) return NextResponse.json(DEFAULT_SETTINGS);
    return NextResponse.json(normalizeSettings(data.value));
}

// PUT: admins change the sidebar sections
export async function PUT(request: Request) {
    try {
        if (!(await getAdminAccess())) {
            return NextResponse.json({ error: 'Only admins can change workspace settings' }, { status: 403 });
        }

        const settings = normalizeSettings(await request.json());

        // A section that still holds clients cannot be removed: they would have nowhere to show.
        const { data: clients, error: clientError } = await supabase.from('clients').select('status');
        if (clientError) throw clientError;
        const names = new Set(settings.sections.map((s) => s.name));
        const orphaned = [...new Set((clients || []).map((c: any) => c.status as string))].filter((s) => s && !names.has(s));
        if (orphaned.length > 0) {
            return NextResponse.json(
                { error: `"${orphaned[0]}" still has clients in it. Move them to another section first, or hide the section instead.` },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('workspace_settings')
            .upsert({ key: KEY, value: settings, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (error) {
            console.error('Settings save error:', error);
            return NextResponse.json(
                { error: 'Settings could not be saved. Has supabase-migration-workspace-settings.sql been run?' },
                { status: 500 }
            );
        }
        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Unable to save settings' }, { status: 500 });
    }
}
