-- ASR Media Pro — Database lock-down
--
-- RUN THIS ONLY AFTER the app version that reads data through the server is live,
-- and SUPABASE_SERVICE_ROLE_KEY is set in the hosting environment. Running it against
-- an older version of the app will make every screen come up empty.
--
-- What it does: switches on row level security for every app table and removes any
-- "allow everyone" policies. After this, the public (anon) key that ships inside the
-- website can no longer read or change anything. The app keeps working because the
-- server uses the service role key, which is not affected by row level security.
--
-- No data is changed or removed. Safe to re-run.

DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'clients', 'categories', 'tasks', 'chat_messages', 'quick_notes']
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'Table % does not exist, skipping', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- With no policies left, only the service role can reach the table.
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      RAISE NOTICE 'Removed policy "%" on %', p.policyname, t;
    END LOOP;
  END LOOP;
END $$;

-- Check: every table should show rls_on = true and policies = 0.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_on,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'clients', 'categories', 'tasks', 'chat_messages', 'quick_notes')
ORDER BY c.relname;

-- To undo (the app goes back to how it was before this file):
--   ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;   -- once per table above
