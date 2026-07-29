# Practice — desktop auto-submit + tutorial polish + emoji→icon

## Problem (from founder, desktop)
1. Practice doesn't feel right on desktop. Building a word leaves it **stuck selected** — players think they must *click elsewhere* to submit.
2. Want: word **auto-submits after the drag is done** (release), and **auto-submits if a PC player stalls > 1s** with **> 2 letters** selected.
3. Tutorial "fun effect + UI" feels weak (desktop welcome card is plain).
4. Replace literal emoji with lucide icons.

## Root cause (verified by reading)
- Practice Classic + WordHunt render the real `<GridComponent>` → `useGridInteraction`.
- Desktop `handleMouseDown` routes through `useGridClickHandler` (**click-select mode**). Click-build only submits via: re-click last tile, double-click (<500ms), or **click-outside** (`useGridInteraction.ts:622`). New players discover none → "click elsewhere to submit".
- A drag *does* submit on `mouseup` (`handleTouchEnd`). The existing stall auto-submit (`:257`) is gated behind `comboLevel > 0`; practice never sets combo → dead.

## Research (industry standard)
Drag-trace → **release-to-submit** is the dominant pattern (Word Wipe / Boggle / Word Hunt). Click-each-letter is a fallback that submits on last-letter click or **auto-submit on idle**. "Click elsewhere" is not a real pattern.

## Decision
Add an **opt-in idle auto-submit** to `useGridInteraction`, enabled in practice only:
- New prop `autoSubmitIdleMs?: number` on `GridComponent` → `useGridInteraction` (undefined = off → MP/daily unchanged).
- Effect: when `interactive && autoSubmitIdleMs != null && !isTouchDeviceRef.current && selectedCells.length >= 3` → arm a timer; reset on every selection change; on fire submit + reset drag refs (so a later `mouseup` is a no-op → no double-submit). Guard prevents re-arm during the post-submit clear window.
- **Desktop only** (`!isTouchDeviceRef.current`): mobile keeps release-to-submit so a paused finger never fires early.
- Wire `autoSubmitIdleMs={1000}` on Classic + WordHunt sandboxes. (Wheel uses its own `onPointerUp` release — already submits.)
- Side-effect-free on the working drag path: a clean drag-release clears selection immediately, so the idle timer (fires only if selection *stays* ≥3 for 1s) never triggers there. It fires exactly in the broken cases (click-built word sitting, drag-then-stall).

## Tutorial polish + icons
- `PracticeDesktopWelcome`: per-mode lucide icon triple (reuse `PracticeTutorialSheet` `TIP_ICONS`), hard-shadow icon tiles, staggered entrance, mode-accent header, a "drag to spell · release to submit" interaction hint. No emoji.
- Replace emoji with lucide icons:
  - Hub `MODE_EMOJI` ✏️🔍🎡 → `Pencil` / `Search` / `Disc3`
  - `PracticeCoachingTip` 💡🔥⚡🏆 → `Lightbulb` / `Flame` / `Zap` / `Trophy`
  - `PracticeDesktopWelcome` ✏️💡🎯 → per-mode triple
  - `ModifierBanner` 🎯 → `Target`
  - `PracticeWordHuntSandbox` 💡/🔍 → `Lightbulb` / `Search`

## TDD
- `useGridInteraction.idleAutoSubmit.test.ts`: (a) desktop, 3 click-built letters, idle ≥1s → submits; (b) 2 letters → no submit; (c) prop off → no auto-submit (MP preserved); (d) touch device (window touchstart fired) → no idle submit.

## Out of scope
Wheel input rework; MP/daily auto-submit; mobile idle-submit.
