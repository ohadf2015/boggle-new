# Party Games: Make It Work + Mobile-Responsive + Polish

**Date:** 2026-06-06
**Status:** Spec → Implementation
**Scope:** Fix broken party games (caption-clash, pixel-clash, shadow-clash), make phone controllers truly mobile-responsive, add PixiJS + animation polish to TV reveals.

## Context

Party games (3 games, device-split `*Phone`/`*Tv` architecture) were built 2026-06-05 as admin-gated alpha. Backend engines are well-tested (13 files); frontend is nearly untested (1 file). "Responsive/visual polish + live playtest" was explicitly never done. Telemetry confirms ~zero prod plays → no telemetry repro; verification = **frontend socket↔component integration tests** (the real coverage gap).

Verification done before this spec:
- **Socket event-name diff** (server emit vs client subscribe): caption + shadow fully matched; pixel has 2 dead *listeners* (`artistStrokes`, `relayBands`) never emitted — cosmetic, no gameplay break. → "not working" is NOT a socket-name mismatch.
- **Cross-game close-read** surfaced repeating defects (below). Same bugs recur across all 3 games → fix via **shared primitives**, not 6 identical patches.

## Root-cause defect list

### Game-breaking (functional)
- **F1 — Invisible vote UI (`PartyVotingSystem`).** Builds Tailwind classes at runtime: `` `bg-${accentColor}` ``, `` `text-${accentColor}` `` (lines 66, 104, 118). Tailwind JIT can't see runtime strings → classes purged from bundle → selected votes + winners render colorless/invisible. Breaks voting in every game that uses it.
- **F2 — Shadow eliminated players keep acting (CRITICAL).** `onDiscussionStart` sets `phase='discussion'` unconditionally, overwriting `phase='eliminated'`. Dead players get a live "Call Vote" button + vote ballot. The phase state has no terminal `isEliminated` guard. Also breaks reconnect: `resendShadowState` skips dead sockets, leaving a reconnecting dead player stuck on a spinner.
- **F3 — Shadow TV never rehydrates.** TV `onPhaseChange` only handles `'dealing'`. A TV that refreshes / late-joins mid-game stays on the "Starting…" spinner forever (never emits `party:requestState`, unlike the phone).
- **F4 — Double-submit races (all games).** Submit/vote/night-action handlers call `onSendInput` then `setState`; rapid taps pass the stale-state guard and fire duplicate actions. Caption + pixel submit buttons use `aria-disabled` (cosmetic) not `disabled` (enforcing) → empty/duplicate submits reach backend.

### Mobile-responsive (phone controllers)
- **R1 — No safe-area-inset anywhere.** All roots use `min-h-screen ... p-4`; on notched iPhones / gesture-nav Android, top/bottom controls hide under system UI.
- **R2 — Broken scroll.** `flex-1 overflow-y-auto` children lack `min-h-0` → container won't shrink, page scrolls instead, header scrolls away on long player lists.
- **R3 — Pixel canvas frozen size.** `Math.min(320, window.innerWidth-32)` read once, no resize/orientation listener → wrong size after rotate; never uses tablet width.
- **R4 — Physical props break RTL.** `left-4`, `text-left` instead of logical `start-4`, `text-start` (Hebrew users get mirrored-wrong layout).
- **R5 — Touch targets <44px** (vote/target buttons rely on text height; color swatches 32–36px). WCAG 2.1 AA = 44px.
- **R6 — Drawing canvas missing `touch-action:none`** on the wrapper → two-finger scroll/zoom interrupts strokes.

### i18n (project constraint: all UI text via `t()`)
- **I1 — Hardcoded English:** caption TV ("Speed Round!", "Roast:"), shadow role labels (🐺 Shadow / 👁️ Seer / 🛡️ Medic / 👤 Citizen across dawn/verdict/game-over/eliminated), "Eliminated", "⏭️ Skip".

## Design direction (polish)

From design-system.md + .impeccable.md: **Neo-Brutalist "Jackbox Party Pack"** — dark navy, hard pixel shadows (NO blur), electric color families (lime/pink/cyan/purple), Fredoka + Rubik, RTL-aware, party energy + competitive clarity. Phone = focused controller; TV = loud spectacle.

- **P1 (animate-ai):** Orchestrated TV reveal sequences — caption crown spotlight, shadow dawn/verdict, pixel merge reveal. Staggered, exponential ease-out, `prefers-reduced-motion` aware. NO bounce/elastic.
- **P2 (pixijs-2d):** TV-only celebration particle layer (hard-edged confetti / ember burst in mode accent color) on winner-crowning moments. Reuse `WordCraftPixiStage` mount/destroy pattern (pixi.js ^8.17.1, dynamic import, `app.destroy({removeView:true},{children:true})`). **Do NOT** touch the working `react-sketch-canvas` drawing input.

## Solution architecture (shared-first)

New shared primitives (one fix → all 3 games):

1. **`lib/party/partyAccent.ts`** — pure static class map: `accentClasses(accent) → { bg, text, border, ring }` with the full literal class strings (so JIT sees them). Fixes F1. *(TDD)*
2. **`components/party/shared/PartyPhoneShell.tsx`** — root wrapper: `dir` from `useLanguage()`, `min-h-dvh`, safe-area padding, flex-col, scroll-safe slot. Replaces repeated root divs → fixes R1, R2, R4 root, RTL dir. *(TDD)*
3. **`globals.css`** utilities: `.pb-safe`, `.pt-safe`, `.px-safe` → `max(1rem, env(safe-area-inset-*))`. Used by the shell.
4. **`lib/party/shadowRoleLabel.ts`** — pure `(role, t) → label` helper. Fixes I1 role labels. *(TDD)*
5. **`hooks/useSubmitGuard.ts`** — ref-based one-shot guard `{ guarded(fn), reset() }`. Fixes F4 races deterministically. *(TDD)*
6. **`lib/party/shadowPhase.ts`** — pure reducer making `eliminated` terminal/sticky (discussion/vote/night events no-op once dead). Fixes F2. *(TDD)*

Per-game wiring (use the primitives):
- **Caption:** shell + submit `disabled` + submit/vote guards + i18n (Speed/Roast keys).
- **Pixel:** shell + `disabled` attr + remove dead listeners + canvas → `cqmin` container-query sizing + `touch-action:none` + 44px swatches + draw/guess/vote guards.
- **Shadow:** shell + shadowPhase reducer (eliminated sticky) + night/vote guards + role-label helper + "Eliminated"/"Skip" keys + **TV requestState on mount** + map gameState phases on TV.
- **`PartyVotingSystem`:** swap dynamic classes for `accentClasses()`; add `min-h-11` + logical props.

## Test plan (TDD — RED first)

Pure-logic units (Vitest, frontend):
- `partyAccent.test.ts` — returns literal class strings for each accent; unknown → lime default.
- `shadowRoleLabel.test.ts` — each role maps to its `t()` key; calls t, not raw enum.
- `shadowPhase.test.ts` — once eliminated, discussion/vote/night transitions are no-ops; non-eliminated transitions normal.
- `useSubmitGuard.test.ts` — second call within same cycle blocked; reset re-arms.

Component integration (React Testing Library + mock socket):
- `PartyPhoneShell.test.tsx` — sets `dir` from language; applies safe-area classes; renders children.
- `PartyVotingSystem.test.tsx` — selected/winner option carries the real accent bg/text class (regression for F1).
- `ShadowClashPhone.test.tsx` — eliminated player: discussionStart does NOT show Call-Vote; ballot hidden (regression for F2).
- `CaptionClashPhone.test.tsx` — empty caption → submit disabled; one click → single emit (F4); no hardcoded English in rendered TV labels.

## Out of scope
- Rewriting the drawing input to PixiJS (advisor: pure regression risk).
- Backend engine changes (well-tested, event names matched) — except none needed; `resendShadowState` already exists for TV rehydration via `party:requestState`.
- Live device playtest (env-blocked) — integration tests are the verification of record.

## Phases
1. **Shared primitives + i18n keys** (TDD) — partyAccent, shadowRoleLabel, useSubmitGuard, shadowPhase, PartyPhoneShell, globals.css utils, 5-lang party keys.
2. **Per-game functional + responsive wiring** (TDD) — PartyVotingSystem, then caption → pixel → shadow.
3. **Polish** — animate-ai reveal sequences + pixijs-2d TV celebration layer.

Validate each phase: `npm run lint && npm run test:frontend && npm run build`. Commit per phase (ask first).
