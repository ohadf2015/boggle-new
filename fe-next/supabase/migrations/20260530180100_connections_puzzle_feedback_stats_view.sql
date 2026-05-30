-- Per-puzzle player-feedback aggregate (likes/dislikes/give-ups) for the admin
-- review tool + the nightly improvement collector.
create or replace view public.connections_puzzle_feedback_stats as
select
  puzzle_id,
  count(*) filter (where rating = 'like') as likes,
  count(*) filter (where rating = 'dislike') as dislikes,
  count(*) filter (where gave_up) as gaveups,
  count(*) as total
from public.connections_feedback
group by puzzle_id;
