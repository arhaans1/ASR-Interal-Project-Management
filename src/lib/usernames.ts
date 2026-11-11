import { supabase } from '@/lib/supabase';

// Sign-in looks a username up in team accounts first, then in clients, and signs in the
// first match. So a username must belong to one person only, across both.
// Server-side only.
export async function isUsernameTaken(username: string, excludeClientId?: string): Promise<boolean> {
    // ilike treats % and _ as wildcards; match the text exactly, ignoring case
    const exact = username.trim().replace(/[\\%_]/g, '\\$&');
    if (!exact) return false;

    const [users, clients] = await Promise.all([
        supabase.from('users').select('id').ilike('username', exact),
        supabase.from('clients').select('id').ilike('username', exact),
    ]);
    if (users.error) throw users.error;
    if (clients.error) throw clients.error;

    const otherClients = (clients.data || []).filter((c: { id: string }) => c.id !== excludeClientId);
    return (users.data || []).length > 0 || otherClients.length > 0;
}
