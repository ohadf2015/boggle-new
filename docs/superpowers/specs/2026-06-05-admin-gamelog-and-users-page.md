# Admin game-log clarity + users-page declutter & gifting

**Date:** 2026-06-05 · **Status:** implementing

## Problem (user-reported)
Admin dashboard:
1. Game log shows an **id instead of a name** for authed players and for guests who chose a name.
2. Rows sometimes show **0 score / 0 words** with no explanation of what happened.
3. No indication when a player **left the game mid-way**.
4. No indication that a player was **invited by another player**.
5. Admin **Users page is cluttered** and hard to use, especially for **gifting** players.

## Root causes (verified against live data 2026-06-05)
- **#1 name-vs-id:**
  - Authed players already resolve via the route `profiles` JOIN (profiles attach to ALL lifecycle rows, not just `game_completed` — `route.ts` collects player_ids from every row). Authed "Player {id8}" only on a genuinely missing profile (rare).
  - **Guest MP players are the dominant gap.** A guest's join-chosen username is sent over the socket but never persisted to `guestManager` (`setGuestName` is called ONLY in `HeaderMobileMenu`). So `persistToSupabase`'s `getGuestName()` returns null → analytics `metadata.guest_name` is null → log falls back to `Guest {sessionShort}` (an id fragment). Data query: `meta_has_guestname=false` for all 60 recent rows.
- **#2/#3 0/0 + left mid-game:** `buildPlayer` already computes `status: 'completed' | 'abandoned' | 'errored'`, but `PlayerRow` renders a badge ONLY for `errored`. An abandoned player shows 0/0 with no badge → reads as a mystery. Same fix covers both: always render a status badge.
- **#4 invited-by:** Derivable, no new data. Non-host player in a multiplayer group joined the host's room (matchmaking exists in backend but is NOT UI-wired → today every non-host MP joiner came via the host's code = invited). `group.host.displayName` already exists.

## Changes

### Commit 1 — game-log clarity
- **`lib/admin/gameLog/groupGames.ts`** (pure, TDD):
  - `buildPlayer`: resolve `displayName`/`profile` by scanning ALL `acc.rows` for the first with a real `profiles.username`/`display_name`/`guest_name`/`meta.username`, decoupled from the terminal-preferred stat row. Robust against any single row missing identity.
  - `GamePlayer`: add `invitedByName: string | null`. In `buildGroup`, after players + host resolved: for each non-host player in a multiplayer group, set `invitedByName = host.displayName`.
- **`components/admin/today-games/components/GameGroupDetailPanel.tsx`** (`PlayerRow`):
  - Always render a status chip: `abandoned`→"Left mid-game", `errored`→"Error", `completed`→ none (or subtle). Clarifies 0/0.
  - Render "Invited by {name}" line when `invitedByName` present.
- **`components/admin/today-games/components/GameRow.tsx`** (flat/legacy row): surface status when abandoned/errored (lightweight).
- **`hooks/useMultiplayerSocket.ts`**: at the guest `join` emit chokepoint, persist the chosen name via `setGuestName(username)` when unauthenticated — forward-only fix so future guest MP games carry a name into analytics.
- **i18n ×5** (en/he/sv/ja/es): `admin.todayGames.status.left`, `admin.todayGames.detail.invitedBy`. RTL-verify Hebrew.

### Commit 2 — users page declutter + bulk gift
- **`components/admin/PlayerManager.tsx`**:
  - Collapse the always-on advanced-filter row behind a "Filters" toggle (main declutter).
  - Extract `PlayerCard` (drops file under the 300-line soft cap).
  - Add per-card selection checkbox + "select all on page" + a sticky action bar: "Gift N selected" → opens `PlayerGiftDialog` with those recipients pre-filled.
- **`components/admin/gift/PlayerGiftDialog.tsx`** + `PlayerSelector`: accept `initialRecipients` (array) alongside `initialRecipient`. API + selector already support ≤50 multi-recipients.
- **i18n ×5** for new labels.

## Out of scope (loose ends — listed, not built)
- Matchmaking backend is unwired into UI (`useMatchmaking` unused).
- `game_sessions` legacy guest path is dead (0 rows / 30d).
- `components/gift/AdminGiftModal.tsx` is misnamed (it's the player CLAIM modal, not admin send).
- No gift-history surfaced per player card.
- `setAnalyticsIdentity` timing: authed username may lag first game event (route JOIN compensates).

## Tests
TDD for all pure logic: `groupGames` identity-scan + `invitedByName`. Component tests for the status/invited-by badges and bulk-select wiring. `npm run lint && test && build` before each commit.
