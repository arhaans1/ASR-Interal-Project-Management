import { supabase } from '@/lib/supabase';
import { getSession, SessionData } from '@/lib/auth';

// Who can do what in the team workspace.
//
// Two independent things are stored in users.role:
//   admin            admin
//   operator         admin + operator dashboard   (what "operator" has meant so far)
//   member           team member
//   member_operator  team member + operator dashboard
//
// Admins see every team member's task board and manage users and settings.
// Team members see client projects and only their own task board ("My Tasks").

export type StoredRole = 'admin' | 'operator' | 'member' | 'member_operator';

export const TEAM_BOARD_STATUS = 'Team Members';

export const roleIsAdmin = (role?: string | null) => role !== 'member' && role !== 'member_operator';
export const roleIsOperator = (role?: string | null) => role === 'operator' || role === 'member_operator';
export const toStoredRole = (isAdmin: boolean, isOperator: boolean): StoredRole =>
    isAdmin ? (isOperator ? 'operator' : 'admin') : isOperator ? 'member_operator' : 'member';

export interface TeamAccess {
    userId: string;
    username: string;
    isAdmin: boolean;
    isOperator: boolean;
    boardId: string | null; // this person's own task board, if there is one
    hiddenBoardIds: string[]; // other people's boards (empty for admins)
    hiddenCategoryIds: string[]; // the categories on those boards
}

const sameName = (a?: string | null, b?: string | null) =>
    Boolean(a && b) && a!.trim().toLowerCase() === b!.trim().toLowerCase();

// A person's board is the "Team Members" card that carries their username.
const findBoard = (boards: { id: string; name: string }[], username: string) =>
    boards.find((b) => sameName(b.name, username)) ??
    boards.find((b) => sameName(b.name.split(/\s+/)[0], username.split(/\s+/)[0])) ??
    null;

// Looked up fresh, so a role change applies within a minute without anyone signing out.
const CACHE_MS = 60 * 1000;
const cache = new Map<string, { at: number; access: TeamAccess }>();

export const forgetAccess = (userId?: string) => (userId ? cache.delete(userId) : cache.clear());

export async function resolveAccess(session: SessionData): Promise<TeamAccess> {
    const hit = cache.get(session.userId);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.access;

    const [{ data: user }, { data: boards }] = await Promise.all([
        supabase.from('users').select('id, username, role').eq('id', session.userId).maybeSingle(),
        supabase.from('clients').select('id, name').eq('status', TEAM_BOARD_STATUS),
    ]);

    // The cookie is what we fall back on if the account cannot be read.
    const role = user?.role ?? (session.role === 'operator' ? 'operator' : 'admin');
    const username = user?.username ?? session.username;
    const isAdmin = roleIsAdmin(role);
    const allBoards = (boards || []) as { id: string; name: string }[];
    const own = findBoard(allBoards, username);

    let hiddenBoardIds: string[] = [];
    let hiddenCategoryIds: string[] = [];
    if (!isAdmin) {
        hiddenBoardIds = allBoards.filter((b) => b.id !== own?.id).map((b) => b.id);
        if (hiddenBoardIds.length > 0) {
            const { data: categories } = await supabase.from('categories').select('id').in('client_id', hiddenBoardIds);
            hiddenCategoryIds = (categories || []).map((c: any) => c.id);
        }
    }

    const access: TeamAccess = {
        userId: session.userId,
        username,
        isAdmin,
        isOperator: roleIsOperator(role),
        boardId: own?.id ?? null,
        hiddenBoardIds,
        hiddenCategoryIds,
    };
    cache.set(session.userId, { at: Date.now(), access });
    return access;
}

// The signed-in team member with their current access, or null for clients and visitors.
export async function getTeamAccess(): Promise<TeamAccess | null> {
    const session = await getSession();
    if (!session || session.role === 'client') return null;
    return resolveAccess(session);
}

export async function getAdminAccess(): Promise<TeamAccess | null> {
    const access = await getTeamAccess();
    return access?.isAdmin ? access : null;
}
