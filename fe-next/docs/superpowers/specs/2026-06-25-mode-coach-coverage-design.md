# Mode Coach Coverage + Measurement — Design

**Date:** 2026-06-25
**Goal:** New players still don't know what to do in many game modes. Show them
graphically what to do, without disturbing play.

## TL;DR

The graphical, non-blocking FTUE coach (`ModeCoach` + animated `CoachDemo`)
**already exists and works**. Multiplayer (the core loop, all 6 entry modes)
was **already** wired in commit `002d9f7a1` via `getCoachMode(gameMode)` in
`player/PlayerView.tsx` — that surface is done. The remaining gaps: two **solo**
surfaces that new players hit (solo **Blast** and the **daily Word Hunt**
survival) mount no coach, and there is **no telemetry** on coach exposure /
dismissal anywhere. This is not "build a tutorial" — it's "cover the two missing
solo surfaces and make the existing coach measurable."

> **Correction (post-investigation):** an earlier draft of this spec claimed MP
> mounted no coach and proposed a mount in `MultiplayerInGameView`. That was
> wrong on both counts — MP is already covered by `PlayerView`, and
> `MultiplayerInGameView` is currently **unmounted/dead** (nothing imports it).
> That MP work was reverted; only the solo Blast / daily Word Hunt mounts and
> the analytics remain.

## Root cause (verified, not theorized)

`grep '<ModeCoach' app components player host` — the coach is mounted on:

| Mounted | Surface |
|---|---|
| `classic` | `SinglePlayerGame` (solo) |
| `wheelRush` | `WordWheelGame` (solo/daily, `{!practice}`) |
| `crossword`, `shiritori`, `sealedBid`, `connections`, `wordCraft`, `wordAlchemy`, `wordTower` | their solo page clients |
| **all MP modes** | `player/PlayerView.tsx` via `getCoachMode(gameMode)` (commit `002d9f7a1`) — classic/blast/word-hunt/wheel-rush/word-tower/shiritori |

**Genuinely uncovered** (verified `0` ModeCoach refs at HEAD):

- **Solo Blast** — `/blast` (`BlastView`); the MP-only `PlayerView` mount does
  not cover the standalone solo Blast surface. `blast` has a rich authored demo
  (`drag` + `clearTiles`).
- **Daily Word Hunt** — `DailyWordHuntSurvival`; daily survival is its own
  component tree, not routed through `PlayerView`. `wordHunt` has a rich demo
  (`tapClue` + `drag`).

Second finding: **no coach analytics exist** (`grep` for
`mode_coach_*` / `coach_shown` → nothing). Nobody can tell whether the coach is
seen, skipped, or works — which is why "players dismiss before reading" stays a
guess. Making it measurable is part of the fix (and it instruments the existing
`PlayerView`/solo coaches too, since they all share `useModeCoach`).

> **Lesson:** the original Explore grep scoped to `app/ components/` and missed
> `player/` + `host/`, producing a false "MP has no coach" picture. Always
> include `player/` and `host/` when auditing in-game UI.

## Non-goals (deliberately deferred — YAGNI)

- **Do NOT reverse dismiss-on-first-touch or mark-on-show.** Both are
  documented intentional choices (`ModeCoach.tsx:53`, `useModeCoach.ts:60`:
  abandon-safe, no per-mode wiring). The hunch that they cause the problem is
  unverified. Decide this **later, from the new analytics** — not now.
- No ghost-hand-on-the-real-board demos (expensive per-mode coordinate wiring).
- No upgrading the simple-tier emoji demos (revisit only if the funnel flags a
  specific mode after coverage lands).
- No cross-device DB persistence of "seen" (the `onShown` backfill hook stays
  unused for now).
- No Adventure mount (no live route).

## Design

### 1. Multiplayer coverage — already done (no change)

MP is wired in `player/PlayerView.tsx`: a local `getCoachMode(gameMode)` maps
the kebab `GameMode` to a `CoachModeKey` and renders `<ModeCoach>` once as a
sibling, above `PlayerInGameView`'s per-mode early returns. Covers
classic/blast/word-hunt/wheel-rush/word-tower/shiritori on the player phone.
Nothing to add. (`MultiplayerInGameView` is a separate, currently-unmounted
component — do **not** add a coach there.)

### 2. Solo Blast

Mount `<ModeCoach mode="blast" />` inside `BlastView`'s `phase === 'playing'`
block (`components/blast/legacy/BlastView.tsx`) — so it shows during gameplay,
not over the ready/results phases. This is the standalone solo Blast surface,
distinct from the MP path `PlayerView` covers. The `clearTiles` demo renders in
production for the first time here.

### 3. Daily Word Hunt

Mount `<ModeCoach mode="wordHunt" />` in `DailyWordHuntSurvival` (both the
desktop and mobile returns), gated `{!practice}`. The component is shared with
the practice Word Hunt sandbox, which has its own `PracticeCoachTip` — the
`!practice` gate prevents double-coaching. The `tapClue` demo renders in
production for the first time here.

### 4. Analytics (makes the dismiss-timing question answerable)

Single emit-side inside `useModeCoach` (mirrors the `streakTelemetry.ts`
pattern — `import posthog from '@/lib/analytics/lazyPosthog'`, swallow errors,
never block the game):

- `mode_coach_shown { mode }` — fired where `markCoachSeen` already runs
  (`useModeCoach.ts:60`), alongside the existing `onShown`.
- `mode_coach_dismissed { mode, reason, step }` — `reason ∈
  { skip, board_touch, escape, completed }`.

`dismiss()` is currently reason-less. Thread an optional `reason` through
`dismiss(reason)` in `useModeCoach` and pass it from the three call sites in
`ModeCoach.tsx` (Skip button → `skip`, board pointer → `board_touch`, Escape →
`escape`) and from `advance()` on the last step → `completed`. Default `skip`
to stay backward-compatible.

## Components touched

| File | Change |
|---|---|
| `hooks/useModeCoach.ts` | `dismiss(reason?)`; emit `mode_coach_shown` / `mode_coach_dismissed` via lazyPosthog (emit-once-per-show guard) |
| `components/tutorial/ModeCoach.tsx` | pass dismiss reasons (skip/board_touch/escape/completed) |
| `components/blast/legacy/BlastView.tsx` | mount `<ModeCoach mode="blast" />` in the `playing` phase |
| `components/daily/DailyWordHuntSurvival.tsx` | mount `<ModeCoach mode="wordHunt" />` in both returns, `{!practice}` |
| `hooks/__tests__/useModeCoach.test.ts` | analytics + dismiss-reason coverage |
| `components/tutorial/CoachDemo.test.tsx` | smoke-render all 10 demo types (covers `clearTiles`/`tapClue` shipping for the first time) |

No new i18n strings (blast + wordHunt coach copy already present and translated
in all 5 languages under `modeCoach.*`; analytics reasons are non-UI).

## Testing (TDD, RED→GREEN)

- **Hook** — `useModeCoach` (mock `lazyPosthog`): emits `mode_coach_shown` once
  on first show; emits `mode_coach_dismissed` with the right `reason` for
  skip / board_touch / escape / completed; emits at most once per show cycle;
  emits nothing on repeat visits (already-seen).
- **Demos** — `CoachDemo` smoke-renders all 10 demo types without throwing
  (the only coverage `clearTiles` / `tapClue` have, since they ship for the
  first time via the Blast / daily Word Hunt mounts).
- **Component** — existing `ModeCoach.test.tsx` stays green (dismiss-reason
  changes don't alter behavior, only telemetry).
- **Regression** — existing solo + `PlayerView` MP mounts unaffected.

## Risks

- **Double coach** if practice and live share a component. Daily Word Hunt
  reuses `DailyWordHuntSurvival` for both — gated `{!practice}` (practice has
  its own `PracticeCoachTip`). The per-mode show-once localStorage gate makes
  any residual overlap harmless (first instance marks seen).
- **Unverified:** live in-context placement in MP and the solo Blast `playing`
  phase (impractical to render-QA headlessly). The coach is the same
  fixed-position, non-blocking, self-dismissing overlay proven on 9 other
  surfaces, so worst case is cosmetic, not a broken flow.

## Follow-up (after this ships, data-driven)

Once `mode_coach_shown` / `mode_coach_dismissed` accrue ~1–2 weeks:
- If `board_touch` dominates with low `step` → early-dismiss is real → revisit
  the grace/auto-dismiss behavior (the deferred non-goal) **with evidence**.
- If a specific simple-tier mode shows high shown→drop → upgrade its demo.
