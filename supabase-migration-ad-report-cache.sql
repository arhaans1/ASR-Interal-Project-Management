-- ASR Media Pro — Saved ad performance reports
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.
--
-- The last report for each client and date range, so the Ad Performance and Results tabs open
-- instantly and then refresh from Meta in the background. Only the server reads or writes it.

CREATE TABLE IF NOT EXISTS ad_report_cache (
  key TEXT PRIMARY KEY,                 -- hash of the client's ad settings, date range and viewer
  report JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_report_cache_updated_at ON ad_report_cache(updated_at);

-- Same lock-down as every other table: only the server can read or write it.
ALTER TABLE ad_report_cache ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
