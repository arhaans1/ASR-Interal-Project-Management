-- ASR Media Pro — add the launch handover tasks to existing client cards
-- New cards get them from the funnel templates. This adds them to cards made before, in
-- every "Recording & Launch" or "Launch" phase that does not have them yet. Safe to re-run.
--
-- They go right after the last client task in the phase (e.g. after "Record your video ads"),
-- so the team's setup and launch tasks stay at the end.

WITH phases AS (
  SELECT cat.id AS category_id,
         COALESCE(MAX(t.order_index) FILTER (WHERE t.owner = 'client'), -1) AS after_index
  FROM categories cat
  JOIN clients c ON c.id = cat.client_id
  LEFT JOIN tasks t ON t.category_id = cat.id
  WHERE cat.name IN ('Recording & Launch', 'Launch')
    AND c.status <> 'Team Members'
    AND NOT EXISTS (
      SELECT 1 FROM tasks x
      WHERE x.category_id = cat.id AND x.task_key IN ('connect_accounts', 'software_payment', 'ghl_handover')
    )
  GROUP BY cat.id
),
new_tasks(task_key, name, step) AS (
  VALUES
    ('connect_accounts', 'Connect your Gmail, WhatsApp and Google Meet / Zoom', 0.25),
    ('software_payment', 'Complete the software payment', 0.5),
    ('ghl_handover', 'GHL access handover and demo', 0.75)
)
INSERT INTO tasks (category_id, name, completed, order_index, owner, is_onboarding, is_approval, task_key)
SELECT p.category_id, n.name, FALSE, p.after_index + n.step, 'client', FALSE, FALSE, n.task_key
FROM phases p CROSS JOIN new_tasks n
RETURNING category_id, task_key;
