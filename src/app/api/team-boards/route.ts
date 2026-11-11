import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTeamAccess, TEAM_BOARD_STATUS } from '@/lib/access';

// GET: the names of the team (for assigning a task to someone). Names only: what is on
// each person's board stays private to them and the admins.
export async function GET() {
    try {
        if (!(await getTeamAccess())) {
            return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
        }
        const { data, error } = await supabase
            .from('clients')
            .select('id, name')
            .eq('status', TEAM_BOARD_STATUS)
            .order('name');
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error) {
        return NextResponse.json({ error: 'Unable to load the team' }, { status: 500 });
    }
}
