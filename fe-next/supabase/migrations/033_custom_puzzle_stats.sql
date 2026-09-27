-- Custom Puzzle Attempts Table
-- Tracks who played which custom puzzle and their performance
create table if not exists custom_puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  -- Puzzle reference
  puzzle_code text not null references custom_puzzles(puzzle_code) on delete cascade,

  -- Player identity (one of these must be non-null)
  player_id uuid references auth.users,
  guest_fingerprint text,

  -- Display info
  display_name text not null,
  avatar_emoji text not null,
  avatar_color text not null,
  avatar_image text,
  profile_picture_url text,
  country_code text,

  -- Performance metrics
  solved boolean not null,
  attempts_used integer not null check (attempts_used >= 1 and attempts_used <= 10),
  target_word text not null,

  -- Detailed attempt history
  attempt_words jsonb not null,

  -- Survival mode stats (optional)
  words_discovered jsonb,
  life_remaining integer,
  clue_tokens_earned integer,
  clue_tokens_spent integer,
  hints_unlocked integer,
  efficiency_score integer,

  completed_at timestamptz not null,

  -- Constraints
  constraint custom_puzzle_attempts_player_or_guest check (
    (player_id is not null and guest_fingerprint is null) or
    (player_id is null and guest_fingerprint is not null)
  ),

  -- Unique constraint: one attempt per puzzle per player/guest
  constraint custom_puzzle_attempts_unique unique(puzzle_code, player_id, guest_fingerprint)
);

-- Indexes for performance
create index if not exists idx_custom_puzzle_attempts_code on custom_puzzle_attempts(puzzle_code);
create index if not exists idx_custom_puzzle_attempts_player on custom_puzzle_attempts(player_id);
create index if not exists idx_custom_puzzle_attempts_guest on custom_puzzle_attempts(guest_fingerprint);
create index if not exists idx_custom_puzzle_attempts_solved on custom_puzzle_attempts(solved);

-- Enable RLS
alter table custom_puzzle_attempts enable row level security;

-- Policies
create policy "Custom puzzle attempts are viewable by everyone"
  on custom_puzzle_attempts for select
  using (true);

create policy "Anyone can submit custom puzzle attempts"
  on custom_puzzle_attempts for insert
  with check (true);

-- Leaderboard View for Custom Puzzles
-- Shows top performers for each puzzle
create or replace view custom_puzzle_leaderboard as
select
  puzzle_code,
  player_id,
  guest_fingerprint,
  display_name,
  avatar_emoji,
  avatar_color,
  avatar_image,
  profile_picture_url,
  country_code,
  solved,
  attempts_used,
  efficiency_score,
  words_discovered,
  life_remaining,
  completed_at,
  row_number() over (
    partition by puzzle_code
    order by
      solved desc,
      efficiency_score desc nulls last,
      attempts_used asc,
      completed_at asc
  ) as rank_position
from custom_puzzle_attempts
where solved = true; -- Only show solved attempts on leaderboard

-- Stats Aggregation View for Custom Puzzles
-- Provides creator dashboard statistics
create or replace view custom_puzzle_stats as
select
  cp.puzzle_code,
  cp.creator_id,
  cp.creator_display_name,
  cp.language,
  cp.target_word,
  cp.created_at,
  cp.creator_efficiency_score,

  -- Total attempts
  count(cpa.id) as total_attempts,

  -- Success metrics
  count(case when cpa.solved = true then 1 end) as total_solved,
  round(
    100.0 * count(case when cpa.solved = true then 1 end)::numeric /
    nullif(count(cpa.id), 0),
    2
  ) as solve_rate,

  -- Average performance (only for solved attempts)
  round(avg(case when cpa.solved = true then cpa.attempts_used end), 2) as avg_attempts_solved,
  round(avg(case when cpa.solved = true then cpa.efficiency_score end), 2) as avg_efficiency_score,
  max(cpa.efficiency_score) as max_efficiency_score,

  -- Survival mode averages (if applicable)
  round(avg(case when cpa.solved = true then cpa.life_remaining end), 2) as avg_life_remaining,
  round(avg(case when cpa.solved = true then jsonb_array_length(cpa.words_discovered) end), 2) as avg_words_discovered,

  -- Attempt distribution (1-10 attempts)
  count(case when cpa.solved = true and cpa.attempts_used = 1 then 1 end) as solved_in_1,
  count(case when cpa.solved = true and cpa.attempts_used = 2 then 1 end) as solved_in_2,
  count(case when cpa.solved = true and cpa.attempts_used = 3 then 1 end) as solved_in_3,
  count(case when cpa.solved = true and cpa.attempts_used = 4 then 1 end) as solved_in_4,
  count(case when cpa.solved = true and cpa.attempts_used = 5 then 1 end) as solved_in_5,
  count(case when cpa.solved = true and cpa.attempts_used = 6 then 1 end) as solved_in_6,
  count(case when cpa.solved = true and cpa.attempts_used = 7 then 1 end) as solved_in_7,
  count(case when cpa.solved = true and cpa.attempts_used = 8 then 1 end) as solved_in_8,
  count(case when cpa.solved = true and cpa.attempts_used = 9 then 1 end) as solved_in_9,
  count(case when cpa.solved = true and cpa.attempts_used = 10 then 1 end) as solved_in_10,

  -- How many beat the creator
  count(case when cpa.solved = true and cpa.efficiency_score > cp.creator_efficiency_score then 1 end) as beat_creator_count

from custom_puzzles cp
left join custom_puzzle_attempts cpa on cp.puzzle_code = cpa.puzzle_code
group by
  cp.puzzle_code,
  cp.creator_id,
  cp.creator_display_name,
  cp.language,
  cp.target_word,
  cp.created_at,
  cp.creator_efficiency_score;

-- Comment the tables and views
comment on table custom_puzzle_attempts is 'Stores player attempts for custom puzzles';
comment on view custom_puzzle_leaderboard is 'Leaderboard for each custom puzzle showing top performers';
comment on view custom_puzzle_stats is 'Aggregate statistics for custom puzzles for creator dashboard';
