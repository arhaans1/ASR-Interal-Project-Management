-- ASR Media Pro — Project timelines and the client-approval stage
-- Run this once in the Supabase SQL Editor, after supabase-migration-client-onboarding.sql.
-- It is additive and safe to re-run: no existing row is modified or removed.

-- A phase (category) can be due a number of business days after a point in the project:
-- 'onboarding' = the client finished onboarding, 'approval' = the client approved.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS due_after TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS due_days INTEGER;

-- A task where the client signs off on submitted work. While it is open and everything
-- before it is done, the project shows as "Pending client approval".
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_approval BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
