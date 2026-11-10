import { createClient, SupabaseClient } from '@supabase/supabase-js';

// How data reaches the database:
//
//  - On the server, with the service role key. It never leaves the server.
//  - In the browser, through /api/db: a route on this app that checks the signed-in team
//    session and then forwards the query. The browser holds no key that can read the database.
//
// The public anon key is only used for the realtime presence channel ("who is online").

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isBrowser = typeof window !== 'undefined';

const createSupabaseClient = (): SupabaseClient => {
  if (isBrowser) {
    // The key sent from here is a placeholder: /api/db ignores it and uses the session cookie.
    return createClient(`${window.location.origin}/api/db`, supabaseAnonKey || 'browser', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  if (!supabaseUrl) {
    // Build time, when env vars are not available
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }

  // Falls back to the anon key so the app keeps working until the service role key is set.
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey || 'placeholder-key';
  return createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const supabase = createSupabaseClient();

// Realtime only (presence). Carries no access to table data once row level security is on.
const createRealtimeClient = (): SupabaseClient => {
  if (!isBrowser || !supabaseAnonKey) {
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  return createClient(`${window.location.origin}/supabase-api`, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

export const supabaseRealtime = createRealtimeClient();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
