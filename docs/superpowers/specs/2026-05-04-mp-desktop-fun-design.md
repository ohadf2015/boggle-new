# MP Desktop Fun — Design Spec

**Date**: 2026-05-04
**Status**: Spec — pending user review
**Owner**: Ohad
**Sprint**: 5–6 days

## Problem

Desktop multiplayer doesn't feel fun. Players see a mobile-stacked layout at 1920×1080 with a centered grid floating in 60–70% empty horizontal space (viewport audit C1, 2026-05-02). Drag stutters from `PortraitLayout` re-renders (mp-perf audit H1–H3, partly shipped). Keyboard input is wired but undiscoverable — a prior attempt to expose it saw players continue to mouse-drag exclusively. Feedback designed for mobile haptics has nothing to land on at the desktop.

## Goals

1. Desktop MP feels native, not "mobile in a window". Uses the screen, rewards keyboard, gives tactile feedback.
2. A single chassis serves all four MP modes (Standard wheel, Wheel Rush, Blast, Word Hunt). New modes inherit it.
3. Zero mobile regression. The mobile portrait path stays untouched.
4. Closes mp-perf audit items H2 and H3 as a side-effect of chassis ownership.

## Non-Goals

- Visual rebrand. Neo-brutalist + Fredoka stays.
- New game modes or new mechanics.
- Gamepad support. Keyboard + mouse only.
- Spectator-mode features beyond a roster panel.
- Backend changes outside the kb-bonus path.
- TV/party screen layout. Stays its own surface.
- Mobile reflow.

## Success Criteria

- 1920×1080 viewport: game center column ≥720px, side rails populated, no wasted gutters >120px.
- Tab key cycles roster → grid → words ladder. Hotkey hints visible without hover.
- Word-find triggers ≥3 feedback channels (visual flash + audio chord + ladder bump).
- React Profiler median commit count drops ≥30% per round on standard MP @ 1920×1080.
- 4/4 modes render correctly inside the shell at 1920px and outside the shell at 393px.
- No new Sentry warnings post-deploy.

## Approach

**Approach A: Desktop Shell + Slot pattern** (selected). One `MultiplayerDesktopShell` mounts only on desktop and renders a three-column grid. Each mode supplies a thin adapter that maps its store/props to typed slots (`left`, `center`, `right`). Mobile path unchanged.

Rejected alternatives:
- *Per-mode container queries*: 4× the work, no shared primitives. Won't ship in one sprint.
- *CSS-only sweep*: faster, but doesn't fix boring inputs or weak feedback. Cramped becomes wider, not better.

## Architecture

### Layout Chassis

**Component**: `fe-next/components/multiplayer/desktop/MultiplayerDesktopShell.tsx`.

**Mount rule**: `useIsDesktop() && @container (min-width: 1024px)`. Container query (not viewport) so shell adapts inside admin frames or the CrazyGames iframe.

**Grid**: `[1fr • minmax(540px,720px) • 1fr]` single row.

**Slot contract** (typed, discriminated by mode):

```ts
type ShellSlots = {
  left: {
    roster: ReactNode;        // always — players + status dots
    modeBadge: ReactNode;     // mode name + round/timer summary
    secondary?: ReactNode;    // mode-specific (e.g. wheel-rush fog meter)
  };
  center: ReactNode;          // mode's existing game canvas, unchanged
  right: {
    wordsLadder: ReactNode;   // formed/found words live list
    activityStream?: ReactNode; // toasts: steals, combos, joins
    chat?: ReactNode;         // future
  };
  meta: { mode: 'standard' | 'wheel-rush' | 'blast' | 'word-hunt'; roomId: string };
};
```

**Per-mode adapter**: each mode gets a `<Mode>DesktopAdapter` (≤80 LOC) that maps its store to `ShellSlots`. Lives next to mode component. Adapters do not own gameplay logic.

**Graceful collapse**: missing optional slot keeps placeholder so center column doesn't reflow. Placeholders render `aria-hidden` with low-contrast "—".

**Routing**: `MultiplayerInGameView.tsx` gains a desktop branch — `isDesktop && shellEnabled ? <MultiplayerDesktopShell slots={adapter(modeProps)}/> : <ExistingPortraitPath/>`.

**Kill-switch flag**: `mp.desktop-shell.v1` (PostHog). Default `true` on master after smoke-test. Flips to `false` instantly via PostHog if Sentry lights up. **Not used for gating rollout** — every desktop user sees shell from day 4.

### Input Adoption Model

Three layers, designed to overcome the prior failed attempt where players ignored keyboard despite it being wired.

**1. Twin-input merge (always on)**

Keyboard and drag write to the same `formedWord` buffer. `useKeyboardWordInput` and `useGridInteraction` already share state — this sprint verifies and tightens. Player can drag 2 letters, type 2 more, drag the 5th. No mode switch. No "input mode" concept exposed.

**2. Speed-bonus reward (server-sourced)**

Keyboard-submitted words receive +10% score. Server-sourced via existing `scoreMultiplier` path so ranked stays fair. Visible to player as a floating "⌨️ +10%" chip on the score popup. Drag-submitted words = baseline. Adds ~1 day for server wiring.

Economy impact: small. Average word ≈ 30 pts, +10% = +3 pts/word. Gold conversion linear in score. Acceptable.

**3. Forced first-touch demo**

First desktop MP game ever for an account: 3-second auto-demo at round-start types a single 3-letter word in the formed-word strip with key-press visualizer. No tooltip, no popup. Player sees keys light up. PostHog flag `seen_kb_demo` retires it forever per account.

**Hint chip = secondary**

Static hotkey strip at bottom of right rail (Enter=submit, Esc=clear, Backspace=pop). Reference, not promotion.

**Telemetry**: extend existing `word_submitted` event to all 4 modes with `input_method: 'kb' | 'drag'`. After 1 week post-ship, if kb adoption < 15%, drop demo + bonus, keep twin-input merge.

### Feedback Layer

Three channels per event, mode-agnostic. One `useFeedbackChannel(event, payload)` hook + `<FeedbackHost>` portal mounted inside shell.

| Channel | What | Where |
|---|---|---|
| Visual | Center column outline-pulse 80ms, score popup ⬆+N drifts up 600ms | overlays exist; tighten timing |
| Audio | `playCoinCollectSound` + new `playWordFindChord` (3-tone arpeggio, 120ms) | `lib/audio/` has chord primitives |
| Trail | Right rail words-ladder bumps top entry, 400ms shake + accent border | new `<WordsLadder>` component |

**Event matrix**:

| Event | Visual | Audio | Trail |
|---|---|---|---|
| Word found (self) | flash + popup | chord | ladder bump |
| Word found (opponent) | dim flash | muted thud | ladder bump (gray) |
| Steal | red ring on stolen word | rising hiss | ladder strike-through |
| Combo (Blast/Wheel-rush) | confetti burst (existing) | chord arpeggio +1 octave | activity-stream pop |
| Round-end | screen shake 100ms + dim | air-horn | ladder freeze, winner highlight |

**Reduced-motion gate**: `useReducedMotion()` already wired. Disables shake + popup-drift, keeps audio + ladder bump.

**Audio off players**: existing mute respected. Visual emphasis +50% (longer flash, bigger popup) so silent players still feel impact.

### Perf Cleanup (free wins)

**H2 — 4× CircularTimer simultaneous render**: shell owns ONE timer in `slots.left.modeBadge`. Mode components stop rendering timer on desktop. Mobile path unchanged.

**H3 — `t()` called 16×/cell for aria-labels**: `useGridAriaLabels(boardSeed)` memo at `GridComponent.tsx`. One `t()` call per cell per round.

**Deferred**: H5 (render-prop cascade), R2/R3 (results-page).

## File Map

**New (~12 files)**

```
fe-next/components/multiplayer/desktop/
  MultiplayerDesktopShell.tsx        ~140 LOC
  StandardDesktopAdapter.tsx          ~70 LOC
  WheelRushDesktopAdapter.tsx         ~70 LOC
  BlastDesktopAdapter.tsx             ~70 LOC
  WordHuntDesktopAdapter.tsx          ~70 LOC
  WordsLadder.tsx                     ~90 LOC
  RosterRail.tsx                      ~80 LOC
  KeyboardHintStrip.tsx               ~60 LOC
  FeedbackHost.tsx                    ~70 LOC
fe-next/hooks/
  useFeedbackChannel.ts              ~110 LOC
  useGridAriaLabels.ts                ~40 LOC
fe-next/lib/audio/
  wordFindChord.ts                    ~30 LOC
fe-next/lib/experiments/
  flag-mp-desktop-shell.ts            (PostHog kill-switch)
```

**Touched (light)**

- `MultiplayerInGameView.tsx` — desktop branch.
- `useGameTimer.ts` — verify timer state exposed for shell consumption.
- `useKeyboardWordInput.ts` — emit `input_method='kb'` telemetry; thread through to scoring.
- `GridComponent.tsx` — adopt aria-label memo.
- `backend/services/scoring/scoringEngine.ts` — accept `inputMethod` param, apply +10% multiplier when `kb`.
- `translations/{en,he,sv,ja,es}.js` — add `mp.kbHint.*`, `mp.feedback.*`, `mp.ladder.*` keys.

## Sprint Order

| Day | Work |
|---|---|
| 1 | Shell + slot contract + StandardDesktopAdapter behind kill-switch flag (default-on master after smoke). |
| 2 | RosterRail + WordsLadder + KeyboardHintStrip. Mobile regression test at 393px. |
| 3 | Other 3 adapters (Wheel Rush, Blast, Word Hunt). |
| 4 | useFeedbackChannel + chord audio + reduced-motion gate. Client kb telemetry. |
| 5 | Server-side kb-bonus path. Apply +10% multiplier in scoring engine. Round-trip test. |
| 6 | Perf cleanup (H2/H3), profiler before/after, i18n × 5 locales, full test pass. |

## Testing

Per `.claude/rules/22-tdd-strict.md` — RED-GREEN-REFACTOR for each unit. One commit per phase.

- **Unit**: each adapter snap-tests slot output for given mode-store fixture; WordsLadder ladder-order; kb-bonus math; useFeedbackChannel event fan-out; useGridAriaLabels memoization.
- **Component**: shell renders 4 modes × 2 viewports (393, 1920) × 2 locales (en, he RTL).
- **E2E (manual via Playwriter post-ship)**: drag-and-keyboard-mixed word submission, +10% chip visible, ladder bump, reduced-motion off.
- **Perf**: React Profiler diff on 1920 standard round. Median commit count must drop ≥30%.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Mobile regression | Shell strictly gated `useIsDesktop() && @container ≥1024px`. Snapshot tests at 393px. |
| Adapter drift across modes | Slot contract enforced via TypeScript discriminated union. Adapter unit tests assert all required slots. |
| +10% kb-bonus economy creep | Server-sourced via `scoreMultiplier`. Ranked stays fair. ~30 LOC server change. |
| Keyboard adoption stays low | Telemetry-driven. After 1 week, if kb % < 15%, drop demo + bonus, keep twin-input merge. No sunk cost. |
| Audio annoyance | Existing mute respected. Visual emphasis bump compensates. |
| RTL (Hebrew) layout breaks side rails | `lg:grid` with logical-prop rails (`start`/`end` not `left`/`right`). Snapshot at he-IL. |
| CG iframe at narrow desktop width | Container query (not viewport). Shell falls back to portrait below 1024px container. |
| PostHog flag failure → no shell | Hook returns `true` if flag fetch fails. Shell mounts. Mobile-stacked desktop is the regression we're fixing, not a fallback. |

## Open Decisions

None. All locked during brainstorm:
- Scope = all 4 MP modes.
- Approach = A (cross-mode chassis).
- Flag = kill-switch only, default-on master.
- KB bonus = server-sourced, +10%, no A/B.
- Audio default = on, mute respected.

## References

- Audit: `fe-next/docs/audits/multiplayer-ux-2026-05-04.md`
- Audit: `fe-next/docs/audits/mp-perf-2026-05-02.md` (closes H2, H3)
- Audit: `fe-next/docs/audits/viewport-2026-05-02.md` (closes C1 for /multiplayer)
- Pattern: `.claude/docs/responsive-design.md` (container queries)
- Pattern: [Acorn keyboard-shortcuts](https://acorn.firefox.com/latest/desktop/patterns/keyboard-shortcuts-GXVihCfo-GXVihCfo)
- Memory: `ab-testing-infra.md`, `mp-perf-h1-r1-shipped.md`, `boost-picker-shipped.md`
