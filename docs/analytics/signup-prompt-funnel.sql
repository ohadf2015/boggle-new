-- Signup prompt funnel: shown -> clicked -> signed up, per surface.
-- PostHog project 151059 (HogQL). One surface id is shared by
-- growth:signup_prompt_shown, growth:signup_prompt_clicked,
-- growth:signup_dismissed, and the server growth:signup_completed.
--
-- Canonical ids:
--   soft-sheet          post-game sheet (default after a guest game)
--   control             post-game blocking dialog (holdout)
--   mp_sheet            multiplayer results sheet
--   edu_access          teacher access gate
--   header_or_menu      no prompt
-- Old click aliases of soft-sheet: multi_games_sheet, first_win_sheet, first_win_prompt.
-- Old click aliases of control: multi_games_dialog, first_win_dialog.
-- results_inline is retired (0 signups).
--
-- After this ships, every clicked surface in this result also has shown events.

SELECT
  surface,
  count(DISTINCT if(event = 'growth:signup_prompt_shown', person_id, NULL)) AS shown,
  count(DISTINCT if(event = 'growth:signup_prompt_clicked', person_id, NULL)) AS clicked,
  count(DISTINCT if(event = 'growth:signup_dismissed', person_id, NULL)) AS dismissed,
  count(DISTINCT if(event = 'growth:signup_completed', person_id, NULL)) AS signed_up
FROM (
  SELECT
    person_id,
    event,
    multiIf(
      raw_surface IN ('multi_games_sheet', 'first_win_sheet', 'soft_sheet', 'first_win_prompt'), 'soft-sheet',
      raw_surface IN ('multi_games_dialog', 'first_win_dialog', 'dialog'), 'control',
      raw_surface
    ) AS surface
  FROM (
    SELECT
      person_id,
      event,
      coalesce(
        nullIf(toString(properties.surface), ''),
        nullIf(toString(properties.source), '')
      ) AS raw_surface
    FROM events
    WHERE timestamp > now() - INTERVAL 7 DAY
      AND event IN (
        'growth:signup_prompt_shown',
        'growth:signup_prompt_clicked',
        'growth:signup_dismissed',
        'growth:signup_completed'
      )
      AND properties.$host = 'www.lexiclash.live'
  )
)
WHERE surface != ''
GROUP BY surface
ORDER BY shown DESC
