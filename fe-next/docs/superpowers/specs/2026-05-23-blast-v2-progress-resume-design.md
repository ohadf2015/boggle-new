# Blast v2 — Save Player Progress & Resume (Plan 3b)

**Date:** 2026-05-23
**Status:** Design → implementation
**Resolves:** the deferred "Plan 3b" stubs in `lib/blast/v2/useBlastProgress.ts:33` and
`app/[locale]/blast/v2/BlastV2PageClient.tsx:22`.

## Problem

Blast v2 **writes** progress correctly but **never reads it back**.

- `POST /api/blast/clear-level` already updates `blast_progress` atomically via the
  `increment_blast_progress` RPC (`current_level = GREATEST(current_level, p_next_level)`,
  `max_level_cleared`, coins, chest progress). The high-water mark is stored.
- But on mount the client starts at a **hardcoded level 1** (`page.tsx:31 const levelNumber = 1`)
  and seeds `useBlastProgress` to zeros. There is **no GET endpoint** and **no resume**.
- Net effect for a logged-in player: every refresh throws them back to level 1 with 0 coins /
  empty chest, even though the DB knows their real position. Progress is invisible.
- **Guests** (not logged in) fare worse: `clear-level` is auth-gated (401), there is no
  localStorage mirror, so a guest loses their level position on every refresh too.

This is the "save player progress and handle levels that [are] built only [up] to the high[-water
mark]" request: persist + resume, and **build the resumed level at the highest reached level**
instead of always level 1.

## Goals

1. Logged-in players resume at their saved `current_level` with their real coins / chest state.
2. Guests keep their **level position** across refreshes (localStorage). Coins/chests remain a
   sign-in perk (server-only by design).
3. No level-1 flicker on resume — gate the game render until progress resolves.
4. No new SSR auth round-trip (`page.tsx` stays auth-free; resume is client-side).

## Non-Goals (deferred)

- **Level-select map UI** — not planned in Plan 3, out of scope here. Progression stays linear.
- **Local-JWT verify** for the new GET route. We match the sibling blast routes
  (`createClient()` + `auth.getUser()`) for consistency; the read-path JWT optimization
  (`auth-getuser-refactor-playbook`) is tracked separately.

## Design

### 1. `GET /api/blast/progress` (new)

Auth-gated read, mirroring the sibling routes' auth pattern.

- **Unauthenticated** → `401`. (Client treats 401 as "guest" and falls back to localStorage.)
- **Authenticated, row exists** → `200`:
  ```jsonc
  {
    "currentLevel": 7,          // blast_progress.current_level
    "maxLevelCleared": 6,       // blast_progress.max_level_cleared
    "coins": 540,               // blast_progress.total_coins_earned_blast (matches clear-level's "coins")
    "chestNumber": 2,           // blast_progress.current_chest_number
    "chestProgress": 0.35,      // blast_progress.current_chest_progress
    "unlocksSeen": { ... },     // blast_progress.unlocks_seen (jsonb)
    "locale": "en"              // blast_progress.locale
  }
  ```
- **Authenticated, no row yet** (brand-new player) → `200` with defaults
  `{ currentLevel: 1, maxLevelCleared: 0, coins: 0, chestNumber: 1, chestProgress: 0, unlocksSeen: {}, locale: 'en' }`.
  (No write — the row is created lazily by the first `clear-level`.)

`coins` deliberately mirrors what `clear-level` returns (`total_coins_earned_blast`) so the HUD
shows a consistent number across load and clear.

### 2. `lib/blast/v2/guestProgress.ts` (new — pure, testable)

Tiny localStorage helper, SSR-safe (guards `typeof window`).

```ts
const KEY = 'blast-v2-progress';
type GuestProgress = { currentLevel: number; locale: string };

readGuestProgress(): GuestProgress | null   // parse, validate currentLevel>=1, else null
writeGuestProgress(p: GuestProgress): void   // best-effort, swallow quota errors
clearGuestProgress(): void
```

Guests persist **only the level position** (+ locale). Coins/chest are not stored for guests —
they are server-only (`awardCoinsServer` needs a `user_id`).

### 3. `useBlastProgress` — load on mount

Replace the stub `useEffect`. Add to state/return: `currentLevel`, `maxLevelCleared`,
`progressLoaded`, `isGuest`.

On mount:
- `GET /api/blast/progress`.
  - `200` → seed `coins / chestNumber / chestProgress / unlocksSeenFlag` from the body; set
    `currentLevel`, `maxLevelCleared`, `isGuest = false`, `progressLoaded = true`. Also
    `clearGuestProgress()` (server wins).
  - `401` → guest. Read `guestProgress`; set `currentLevel = guest?.currentLevel ?? 1`,
    `maxLevelCleared = max(currentLevel-1, 0)`, coins/chest stay 0, `isGuest = true`,
    `progressLoaded = true`.
  - network error → treat as guest defaults (`currentLevel = 1`), `progressLoaded = true` (never
    hang the boot).

`clearLevel` is unchanged for authed users. (Guests get 401 from the POST as today — they advance
client-side via `onAdvance`, and their position is persisted in `BlastV2PageClient` on advance.)

### 4. `BlastV2PageClient` — resume + boot gate

The SSR `initialLevel` is always level 1 (fast paint, correct for new players & crawlers). The
client resumes from there.

State: `resolvedLevel: BlastLevel | null` (start `null`), `booting: boolean` (start `true`).

Boot effect (runs once, after `progressLoaded`):
- If `currentLevel <= initialLevel.levelNumber` (i.e. `<= 1`) → `resolvedLevel = initialLevel`,
  `booting = false`. No fetch.
- Else fetch `GET /api/blast/level?level=${currentLevel}&locale=${initialLevel.locale}`:
  - ok → `resolvedLevel = fetchedLevel`.
  - not ok / error → fall back to `resolvedLevel = initialLevel` (resume best-effort; never strand
    the player). `booting = false`.

Resume uses the **current URL locale** (`initialLevel.locale`), not the stored `locale` —
progression (`levelNumber`) is the axis; level content is locale-specific. A player who switched
language resumes at the same level number in the new language.

Render:
- While `booting` (or `!progressLoaded`) → lightweight loading screen (mascot + `t('blast.loadingProgress')`),
  same navy background as the end screen. This is the anti-flicker gate.
- Else render `<BlastGame>` with `resolvedLevel`.

`handleAdvance`: on successful advance, if `isGuest`, `writeGuestProgress({ currentLevel: nextNumber, locale })`.
(Authed advance is persisted server-side by `clear-level`; no localStorage needed.)

Guest sign-in nudge: a small one-line `t('blast.signInToSaveRewards')` chip is acceptable but
**optional**; if included it must be a translated string, not hardcoded. Position: non-intrusive,
near the HUD. (Implementer may defer if it complicates the HUD; the resume itself is the priority.)

### 5. Locale / generator safety

Verified: `getLevelSourceForLevel` falls through to the **generator** for any level the curated/chain
packs don't cover, and the generator resolves **any `levelNumber >= 1` for all 5 locales**. So
resuming to `current_level = N` is safe for `en/he/sv/ja/es` and any N. No locale gap.

## Data flow

```
mount
 └─ useBlastProgress: GET /api/blast/progress
      ├─ 200 → seed coins/chest/unlocks, currentLevel=N, progressLoaded
      └─ 401 → guestProgress → currentLevel=N (or 1), progressLoaded
 └─ BlastV2PageClient boot effect (after progressLoaded)
      ├─ N<=1 → resolvedLevel=initialLevel
      └─ N>1  → GET /api/blast/level?level=N&locale → resolvedLevel
 └─ booting=false → render <BlastGame level=resolvedLevel>

clear (authed): POST /api/blast/clear-level → increment_blast_progress (GREATEST) → server truth
advance (guest): writeGuestProgress({currentLevel: next, locale})
```

## Testing (TDD)

- **`GET /api/blast/progress`**: 401 unauth; 200 with row → maps all 7 fields; 200 defaults when no
  row (no write performed); coins field == `total_coins_earned_blast`.
- **`guestProgress.ts`**: read returns null when empty/corrupt/`currentLevel<1`; write→read round-trips;
  clear empties; SSR-safe (no `window` → null / no throw).
- **`useBlastProgress`**: seeds state from a 200 body; sets `currentLevel`/`progressLoaded`; 401 →
  isGuest + reads guest localStorage; network error → defaults + progressLoaded true (no hang);
  clears guest localStorage on a 200.
- **`BlastV2PageClient`**: shows loading until `progressLoaded`/boot done; `currentLevel<=1` renders
  initialLevel with no level fetch; `currentLevel>1` fetches that level and renders it; level fetch
  failure falls back to initialLevel; guest advance writes guestProgress.

## Files

| File | Change |
|---|---|
| `app/api/blast/progress/route.ts` | **new** GET route |
| `app/api/blast/progress/__tests__/route.test.ts` | **new** |
| `lib/blast/v2/guestProgress.ts` | **new** pure helper |
| `lib/blast/v2/__tests__/guestProgress.test.ts` | **new** |
| `lib/blast/v2/useBlastProgress.ts` | load-on-mount; expose currentLevel/maxLevelCleared/progressLoaded/isGuest |
| `lib/blast/v2/__tests__/useBlastProgress.test.ts(x)` | **new/extend** |
| `app/[locale]/blast/v2/BlastV2PageClient.tsx` | resume + boot gate + guest advance persist |
| `app/[locale]/blast/v2/__tests__/BlastV2PageClient.test.tsx` | **new/extend** |
| `translations/{en,he,sv,ja,es}.*` | `blast.loadingProgress` (+ optional `blast.signInToSaveRewards`) |

## Follow-ups (implemented 2026-05-24)

- **`unlocks_seen` write — DONE.** `clear-level` now persists the client's accumulated
  tutorial-seen flags via the pure `mergeUnlocksSeen()` helper (additive union; `clearLevel` and
  BlastGame thread `unlocksSeen` into the POST). `grantVeteranBonus` (telemetry.server.ts) was
  also fixed to merge rather than replace. `veteran_bonus_granted` is a server-owned key the
  client can never clear — a replace there could re-fire the 500-coin bonus.
- **Claim-on-login — DONE (made safe).** New `POST /api/blast/progress`
  (`handleClaimBlastProgress`) bumps **only `current_level`** (`GREATEST`, clamped to
  `[1, 1000]`) — never `max_level_cleared`. Since the veteran bonus is gated on legacy play
  history (not `max_level_cleared`) and there is no blast leaderboard, skipping ahead grants
  nothing (you forfeit the skipped levels' coins), so trusting the client's claimed level is safe.
  `useBlastProgress` fires the claim on authed load when the guest's localStorage level exceeds the
  server's, then clears the guest store.

## Architecture note (resolved 2026-05-24)

The initial cut gave BlastGame its **own** `useBlastProgress` instance, which meant two progress
GETs per page load and a one-frame coin flicker on resume. Worse, seeding BlastGame's hook from
props would have reset coins on every level advance (BlastGame is keyed, so it remounts). Fixed by
**lifting the single instance to `BlastV2PageClient`** and passing it down as the `progress` prop
(`BlastProgressApi`). One GET per load, no flicker, and coins/chest survive the keyed remount.

## Known limitations / accepted costs

- **The boot loader shows briefly for brand-new players** (`currentLevel === 1` still waits on the
  GET). Cheap future win: short-circuit the loader when `progressLoaded && currentLevel === 1`.

## Rollout / risk

- Pure additive read path + a client boot gate. No schema change, no write-path change.
- `page.tsx` stays auth-free → no new SSR latency.
- Worst case (GET fails / level fetch fails) degrades to today's behavior (level 1), never strands
  the player.
- he/sv/ja/es copy needs native review (flagged, non-blocking).
