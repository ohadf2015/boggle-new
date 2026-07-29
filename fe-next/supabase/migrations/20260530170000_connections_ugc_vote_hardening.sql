-- Defense-in-depth for community-riddle voting (app-layer fixes already landed
-- in the vote/moderate routes). These constraints make the DB reject abuse even
-- if a future code path forgets the guard.

-- 1. Cap stored identity length (the guest id is now a server-issued UUID, but
--    bound it so no path can stuff oversized values). NOT VALID first so it
--    only applies to new/updated rows and can't fail on legacy data.
alter table public.connections_ugc_votes
  drop constraint if exists connections_ugc_vote_fp_len;
alter table public.connections_ugc_votes
  add constraint connections_ugc_vote_fp_len
  check (voter_guest_fingerprint is null or length(voter_guest_fingerprint) <= 128) not valid;

alter table public.connections_ugc_puzzles
  drop constraint if exists connections_ugc_puzzle_fp_len;
alter table public.connections_ugc_puzzles
  add constraint connections_ugc_puzzle_fp_len
  check (creator_guest_fingerprint is null or length(creator_guest_fingerprint) <= 128) not valid;
