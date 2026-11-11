-- ASR Media Pro — Workspace settings (sidebar sections)
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.

CREATE TABLE IF NOT EXISTS workspace_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Same lock-down as every other table: only the server can read or write it.
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
