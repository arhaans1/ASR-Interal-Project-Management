-- ASR Media Pro — Client onboarding, funnel types and operators
-- Run this once in the Supabase SQL Editor. It is additive and safe to re-run:
-- no existing column, row or task is modified or removed.

-- 1. Operators ---------------------------------------------------------------
-- Operators are rows in `users` with role = 'operator'.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- If an older CHECK constraint restricts users.role to 'admin', drop it.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 2. Client card: funnel type, operator, onboarding links ---------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS funnel_type TEXT;            -- 'VSL' | 'Webinar' | 'CAM'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;       -- the client's Google Drive folder
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_video_url TEXT;   -- "Start Here" video
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_form_url TEXT;    -- On-Boarding Worksheet

-- operator_id uses the same type as users.id, whatever that is in this project.
DO $$
DECLARE id_type TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'clients' AND column_name = 'operator_id'
  ) THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO id_type
    FROM pg_attribute a
    WHERE a.attrelid = 'users'::regclass AND a.attname = 'id';

    EXECUTE format(
      'ALTER TABLE clients ADD COLUMN operator_id %s REFERENCES users(id) ON DELETE SET NULL',
      id_type
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_operator_id ON clients(operator_id);

-- 3. Tasks: who does it, and is it part of onboarding --------------------------
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner TEXT NOT NULL DEFAULT 'team';          -- 'team' | 'client'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_onboarding BOOLEAN NOT NULL DEFAULT FALSE; -- gates the client dashboard
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_key TEXT;                               -- links a task to its guided step in the portal
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;       -- drives the client timeline

-- 4. Tell the Supabase API about the new columns right away --------------------
NOTIFY pgrst, 'reload schema';
