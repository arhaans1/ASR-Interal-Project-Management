-- ASR Media Pro — Updates inbox in the client portal
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.
--
-- Updates are worked out from the task board; the only thing stored is when the client last
-- opened their inbox, which decides what counts as unread.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS updates_read_at TIMESTAMP WITH TIME ZONE;

-- Existing clients start with everything up to now marked as read, so their inbox does not
-- open with a pile of old "new" updates.
UPDATE clients SET updates_read_at = NOW() WHERE updates_read_at IS NULL;

NOTIFY pgrst, 'reload schema';
