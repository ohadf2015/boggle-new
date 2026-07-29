-- Word Bridge (connections) daily-challenge leaderboard.
-- One best-score row per player (or guest) per UTC puzzle_date.
--
-- IMPORTANT: this table is intentionally NOT added to the supabase_realtime
-- publication. The leaderboard is read on-demand / polled, never subscribed.
-- (See .claude/rules/50-supabase-perf.md — the 2026-05-06 94%-CPU incident.)

create table if not exists public.connections_daily_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- UTC calendar day the daily set belongs to.
  puzzle_date date not null,

  -- Exactly one identity is set (enforced below).
  player_id uuid references auth.users on delete cascade,
  guest_fingerprint text,

  -- Display snapshot.
  display_name text not null,
  avatar_emoji text not null default '🎯',
  avatar_color text not null default '#6366f1',
  avatar_image text,

  -- Performance. Score is clamped server-side before insert (see route).
  score integer not null default 0 check (score >= 0),
  time_taken_seconds integer not null default 0 check (time_taken_seconds >= 0),
  streak integer not null default 1 check (streak >= 0),
  puzzles_solved integer not null default 0 check (puzzles_solved >= 0),
  language text not null,

  constraint connections_daily_scores_identity check (
    (player_id is not null and guest_fingerprint is null) or
    (player_id is null and guest_fingerprint is not null)
  )
);

-- Per-identity uniqueness. Partial indexes are required: a plain composite
-- unique(puzzle_date, player_id, guest_fingerprint) would treat the NULL side
-- as distinct and allow duplicate rows per player.
create unique index if not exists connections_daily_scores_player_uq
  on public.connections_daily_scores (puzzle_date, player_id)
  where player_id is not null;
create unique index if not exists connections_daily_scores_guest_uq
  on public.connections_daily_scores (puzzle_date, guest_fingerprint)
  where guest_fingerprint is not null;

-- Leaderboard ordering: score desc, then faster time, then earlier submit.
create index if not exists connections_daily_scores_rank_idx
  on public.connections_daily_scores (puzzle_date, score desc, time_taken_seconds asc, created_at asc);

alter table public.connections_daily_scores enable row level security;

-- Public read. There is deliberately NO anon insert/update policy: all writes
-- flow through the service-role API route, so client-supplied scores cannot
-- bypass server validation (streak recompute + score clamp).
drop policy if exists "connections daily scores are public" on public.connections_daily_scores;
create policy "connections daily scores are public"
  on public.connections_daily_scores for select using (true);

-- Ranked view for the top-N list. Exposes ONLY display fields + rank — never
-- the raw player_id / guest_fingerprint (those would be a privacy leak on a
-- public board). The route resolves the caller's own rank from the base table.
create or replace view public.connections_daily_leaderboard as
select
  s.puzzle_date,
  s.display_name,
  s.avatar_emoji,
  s.avatar_color,
  s.avatar_image,
  s.score,
  s.time_taken_seconds,
  s.streak,
  s.puzzles_solved,
  s.language,
  s.created_at,
  row_number() over (
    partition by s.puzzle_date
    order by s.score desc, s.time_taken_seconds asc, s.created_at asc
  ) as rank_position
from public.connections_daily_scores s;

comment on table public.connections_daily_scores is
  'Word Bridge daily-challenge best scores. Service-role writes only; public read; NOT in supabase_realtime.';
