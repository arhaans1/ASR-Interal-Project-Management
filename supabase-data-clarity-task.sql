-- ASR Media Pro — add "Install Microsoft Clarity and connect it to the landing page" to existing cards
-- New cards get it from the funnel templates. This adds it, as a team task, to every CAM
-- "Recording & Launch" phase and every VSL / Webinar "Launch" phase that does not have it yet.
-- Safe to re-run.
--
-- It goes right after "Set up the pixel" when the phase has that task, otherwise just before
-- the ad launch task, otherwise at the end.

WITH phases AS (
  SELECT cat.id AS category_id,
         MAX(t.order_index) FILTER (WHERE t.name = 'Set up the pixel') AS pixel_index,
         MIN(t.order_index) FILTER (WHERE t.name IN ('Launch ad campaigns', 'Ad launch')) AS launch_index,
         COALESCE(MAX(t.order_index), -1) AS last_index
  FROM categories cat
  JOIN clients c ON c.id = cat.client_id
  LEFT JOIN tasks t ON t.category_id = cat.id
  WHERE cat.name IN ('Recording & Launch', 'Launch')
    AND c.status <> 'Team Members'
    AND NOT EXISTS (SELECT 1 FROM tasks x WHERE x.category_id = cat.id AND x.task_key = 'clarity_setup')
  GROUP BY cat.id
)
INSERT INTO tasks (category_id, name, completed, order_index, owner, is_onboarding, is_approval, task_key)
SELECT category_id,
       'Install Microsoft Clarity and connect it to the landing page',
       FALSE,
       COALESCE(pixel_index + 0.5, launch_index - 0.1, last_index + 1),
       'team', FALSE, FALSE, 'clarity_setup'
FROM phases
RETURNING category_id, order_index;
