-- ASR Media Pro — Meta ad performance
-- Run once in the Supabase SQL Editor. Additive and safe to re-run: nothing existing is changed.
--
-- Which Meta ad account feeds a client's Ad Performance tab, and how results are counted.
-- Set from the client's Edit window (Meta Ads section).

ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT;   -- e.g. act_1234567890
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_result_type TEXT;     -- 'purchase' (sales) | 'schedule' (appointments)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_result_action TEXT;   -- optional: a custom conversion to count instead of the standard event
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_campaign_filter TEXT; -- optional: only campaigns whose name contains this

NOTIFY pgrst, 'reload schema';
