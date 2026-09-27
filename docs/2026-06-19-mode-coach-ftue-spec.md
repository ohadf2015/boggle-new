# Mode Coach — Gentle FTUE for Every Game Mode

**Date:** 2026-06-19
**Goal:** New players don't know what to do on their first game. Give every mode (solo + MP) a gentle, visual, show-once "how to play" coach that pops in cleanly over the screen, teaches the core gesture + how to score the most, and never interrupts or repeats.

## Problem (from goal + data)

- Existing teaching UI is **fragmented** (6+ localStorage prefixes, a JSON blob, 1 DB column) and **word-heavy** in places (Adventure 3-text-step coach, text ModeIntroCard).
- Some modes have **no** teaching at all (Connections, Word Tower, Word Craft, Alchemy, Sealed Bid).
- `ModeIntroCard`/`ModeRevealOverlay` exist but `modeKey` is never passed → intro path is dead.

## PostHog evidence (new-player first game, 60d, tagged)

classic 97 · word-hunt 47 · blast 39 · wheel-rush 29 · word-tower 1.
→ New players enter through **4 core modes**. Invest rich animated demos there; everything else gets the cheap default.

## Design

**Gentle pop-in coach (NOT a blocking intro).** Renders over live gameplay, slides in clean, auto-dismisses on first meaningful action or after a timeout, fully dismissible, reduced-motion safe. Per user: "it can be just something that pop on the screen gently in a clean clear way."

### Two-tier content registry (`lib/tutorial/modeCoachContent.ts`)
- **Tier 1 — rich animated demo** (classic, word-hunt, blast, wheel-rush): tiny in-card animated gesture demo (drag-path / tap-reveal / swipe / steal) + ≤6-word caption per ≤3 steps, plus ONE "score big" tip.
- **Tier 2 — icon + ≤6-word caption** (all other modes): connections, word-tower, word-craft, word-alchemy, crossword, sealed-bid, shiritori, adventure, party, etc.

Registry is the single source of truth so **every mode has an entry** (satisfies "every mode").

### Primitive
- `lib/tutorial/modeCoachStore.ts` — versioned show-once gate. Key `lc_coach_<mode>_v<N>`. Pure, TDD'd. Mirrors `useModeFirstSeen` versioning. **No migration of existing gates** (advisor: reset risk). DB backfill for authed users via `updateProfile({ mode_coach_seen })` JSON column, mirroring `player_style_modal_shown_at`.
- `hooks/useModeCoach.ts` — `{ visible, step, next, dismiss, markSeen }`. Gated by store. Marks seen at SHOW time (not dismiss) so abandon doesn't re-pop (memory: style-popup mark-on-show).
- `components/tutorial/ModeCoach.tsx` — gentle card. Reduced-motion → static. Auto-dismiss timer + dismiss on first action via `onAction` ref.
- `components/tutorial/CoachDemo.tsx` — shared animation primitives keyed by `demoType` (`drag`|`tap`|`swipe`|`steal`|`connect`|`stack`) so the 4 rich modes reuse, not bespoke each.

### Wiring (one mount per surface)
- Solo: drop `<ModeCoach mode=.. />` into each mode PageClient (connections, word-tower, word-craft, crossword, word-alchemy, sealed-bid, + 4 core).
- MP: mount in pre-game lobby / first round so it's non-intrusive (HostPreGameView / PlayerView). Reuse same `mode` keys.
- Improve existing: Adventure text coach + ModeIntroCard → route through ModeCoach (visual) where they overlap; keep Blast v2 unlocks + Daily visual-first intact (advisor: don't rip out working systems).

### i18n
- New namespace `coach.<mode>.*` (short!) in all 5 files (en/he/sv/ja/es). Captions ≤6 words. RTL-safe.

## Show-once verification (empirical)
Enter mode → coach shows → reload + re-enter → gone. Authed: second device → gone (DB backfill). TDD the pure gate/version logic.

## Scope this session
1. Store + hook + ModeCoach + CoachDemo (TDD).
2. Content registry: ALL modes (tier1 rich + tier2 default).
3. Wire 4 core solo + gaps (connections, word-tower, word-craft, crossword, alchemy, sealed-bid) + MP pre-game.
4. i18n ×5.
5. DB column + backfill (migration mirrors player_style).
6. Verify on `npm run dev` (not :3000 prod).
