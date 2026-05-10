# WordCraft Mobile Input Redesign — Design Spec

**Date:** 2026-05-10
**Owner:** Ohad Fisher
**Status:** Design approved — ready for implementation plan
**Scope:** Mobile-first redesign of WordCraft input mechanics. Board geometry (15×15 Scrabble layout) is sacred and untouched.

---

## 1 — Problem Statement

WordCraft MVP shipped with two parallel input flows on top of a Scrabble-style 15×15 board:

1. **Tap-to-place**: tap rack tile → tap empty cell.
2. **Drag-to-place**: pointerdown rack → drag with ghost-at-pointer → drop on cell (added in `c9b6652f6`).

Player feedback identifies four phone-specific pain points:

| # | Pain | Current cause |
|---|---|---|
| P1 | Finger occludes the dragged tile | `WordCraftDragGhost` renders at `(clientX, clientY)`; target cell shows the dragged letter inside, beneath the thumb. |
| P2 | Tap-to-place feels indirect | Two-tap mechanic with no motion tween: rack tile → cell. UI not physical. |
| P3 | Rack feels cramped on phones | 7 tiles × 56 px + gaps > 360 px-class viewports → wraps to two rows, breaks visual planning. |
| P4 | Pending placements hard to rearrange | Recall is one-tap-per-tile only; no swap, no drag-reorder, no clear-all. |

Goal: a single coherent gesture vocabulary that makes mobile WordCraft feel like manipulating physical tiles, while keeping desktop/TV/landscape parity and Hebrew RTL viable.

---

## 2 — Design Direction (approved)

**Approach B+A combined:**

- **A. Magnetic Drag + Lifted Preview** — refines existing drag so the ghost clears the thumb, target cells render a halo (not a letter), tiles snap-and-haptic on lock, and pending tiles are draggable cell↔cell↔rack.
- **B. Word-Lane Auto-Flow** — once two pending tiles establish an axis (horizontal or vertical), subsequent rack tiles enter via a single tap and auto-snap into the next empty cell along the axis. Eliminates per-cell precision work for placements 3–7 of a turn.

Together: drag is the precision tool for openings and corrections; tap becomes the dominant gesture for the bulk of a turn — directly addressing P2 by changing what tap *means*.

Approaches considered and rejected: pure A (P2 unaddressed), pure B (P1 unaddressed), Approach C (compose-then-drop word-bar — too far from Scrabble feel).

---

## 3 — Layout (per surface)

### 3.1 Portrait phone (primary target)

```
┌──────────────────────────────┐
│ score · heat · turn-of       │ HUD bar (existing, compacted)
├──────────────────────────────┤
│                              │
│      15×15 BOARD             │ pinch-zoom + 1-finger pan
│                              │ pan disabled while drag active
├──────────────────────────────┤
│ ↔ axis │ R·A·C·I·A·L·S  ✕    │ pending-strip (collapses when empty)
├──────────────────────────────┤
│ ◀ [R][A][C][I][A][L][S] ▶    │ rack: horiz-scroll + snap, no wrap
├──────────────────────────────┤
│  Submit │ Recall │ Shuffle   │ action bar
└──────────────────────────────┘
```

- Pinch-zoom lives on a transform container wrapping the board only; `touch-action: none` on the container while the gesture is active prevents page-level pinch.
- Pending-strip mirrors `pendingPlacements` sorted by axis position. Drag-reorder updates the underlying placements list. ✕ on a tile recalls it; ✕ on the strip header recalls all.
- Rack uses CSS `scroll-snap-type: inline mandatory` with side fades; locks at 7 wide on viewports ≥390 px (no scroll), scrolls below.

### 3.2 Landscape phone / tablet portrait

- Board square left, rack + pending-strip + action bar in a right column.
- No scroll on rack.

### 3.3 Desktop / TV

- Existing layout retained; inherits drag-preview offset, axis-lock state, fast-tap from §4. Pinch-zoom is a no-op (handled via mouse wheel + `Ctrl` if needed; otherwise omitted).

### 3.4 RTL (Hebrew)

WordCraft is EN-only at MVP, but layout primitives must not break HE for future:

- Rack scroll uses logical `inline` axis.
- Axis chip uses logical glyphs; horizontal arrow flips via `:dir(rtl) { transform: scaleX(-1) }`.
- Pending-strip ordering reads logical-start to logical-end.

---

## 4 — Input Mechanics

### 4.1 Drag with lifted preview

Replaces the ghost-at-pointer in current `useWordCraftDrag`:

- `pointerdown` records start, no ghost yet (existing 6 px threshold preserved).
- After threshold: ghost spawns at `(clientX, clientY − 88px)` — clears the thumb on phones (~23 mm above contact). On desktop, offset reduced to `−40px`.
- Hovered cell shows **halo only** (`ring-2 ring-neo-cyan + bg-neo-cyan/30 + scale-105`), no letter inside the cell.
- Snap radius = 0.6 × cell width: pointer within radius of any empty cell → cell locks, halo solidifies, `navigator.vibrate(8)` haptic, ghost grows 4 %.
- Release inside snap → drop. Release outside any cell → ghost springs back to its rack slot via GSAP arc (`power2.out`, 220 ms).

### 4.2 Axis-lock state machine

Per-turn state additions (see §6.1):

```
empty → pending(1) → pending(2)+axisLocked → pending(N)+axisLocked
       (drop tile)   (drop 2nd)              (drop or rack-tap)
```

- **1st pending tile**: free placement; UI renders four faint axis-hint dots on N/E/S/W neighbors of the pending cell to telegraph what comes next.
- **2nd pending tile**: axis inferred from `(row, col)` delta:
  - same row → horizontal
  - same col → vertical
  - diagonal → reject placement, `animate-neo-shake` on the dragged tile, tooltip *"tiles must form a line"*
- **3rd+ pending tile**: drop anywhere → snaps to next empty cell along axis from the closest pending tile's direction. Out-of-line drop triggers an **inline toast** *"break the line?"* with `[Yes] [Cancel]` action chips (no modal); accepting unlocks axis back to free, cancel returns the tile to the rack.
- **Rack-tap fast-path**: once axis is locked, a single tap on a rack tile auto-places at `nextEmptyAlongAxis(turn, board)`. Drag is unchanged. Killer for P2.
- **Axis chip** at start of pending-strip shows `→` or `↓`; tap flips axis. Flip recomputes pending positions if rotated word remains continuous; otherwise shake-rejects.

### 4.3 Pending manipulation

- **Pending-strip drag-reorder**: long-press tile in strip (300 ms) → drag horizontally → reinsert. Board cells update in lock-step.
- **On-board drag-pending**: pointerdown on a pending cell → drag like a rack tile. Drop on empty axis cell → move. Drop off-axis → triggers the §4.2 break-axis warning. Drop on rack region → recall to rack.
- **Recall-all**: ✕ on pending-strip header → sweep all pending tiles back to rack with 50 ms stagger.
- **Shake-to-clear** (deferred behind feature flag, code shipped): DeviceMotion API recall-all. Off by default; ship code so a future A/B can flip it.

### 4.4 Tap-to-place (refined fallback)

Still works for accessibility, desktop, first-time users:

- Tap rack tile → selects (lime + ring) — existing behavior.
- Tap empty cell → places via **animated arc** (GSAP, 240 ms parabolic) so the player sees the motion. Kills the "indirect" feeling.
- After axis is locked, subsequent rack taps trigger fast-path (§4.2) — no extra cell tap needed.

### 4.5 Keyboard (desktop a11y)

- Arrow keys move a focus reticle on the board.
- `Tab` cycles rack; `Space` places selected tile at reticle (or via fast-path if axis-locked).
- `Enter` submits turn; `Esc` recalls all pending.

### 4.6 Pain → Fix recap

| Pain | Fix |
|---|---|
| P1 finger covers tile | Lifted ghost @ `−88px` + cell-halo only (no letter beneath thumb) |
| P2 tap indirect | Animated arc on tap-place + axis-lock fast-path means ≥3rd tile is one tap |
| P3 rack cramped | Horizontal scroll-snap rack (§3.1), no wrap |
| P4 pending hard to rearrange | Pending-strip drag-reorder + on-board drag-move + ✕ recall + ✕✕ recall-all |

---

## 5 — Architecture

### 5.1 State additions

```ts
// lib/word-craft/types.ts
export type Axis = 'h' | 'v' | null;

export interface TurnState {
  pending: PlacedTile[];                   // existing
  axis: Axis;                              // NEW
  anchor: { row: number; col: number } | null; // NEW
  axisLockedManually: boolean;             // NEW (true if user flipped chip)
}
```

### 5.2 Pure resolver

```ts
// lib/word-craft/placement.ts (NEW)
export function inferAxis(p1: PlacedTile, p2: PlacedTile): Axis;

export function nextEmptyAlongAxis(turn: TurnState, board: Board): Cell | null;

export function resolveTap(
  rackTile: RackTile,
  turn: TurnState,
  board: Board,
): Placement | { reason: 'no-axis-yet' | 'no-empty-on-axis' };

export function resolveDrag(
  rackTile: RackTile,
  target: Cell,
  turn: TurnState,
  board: Board,
): Placement | { reason: 'occupied' | 'off-axis' | 'breaks-line' };
```

All UI dispatches route through these — single source of truth, trivially testable.

### 5.3 Component map

| File | LOC est | Status |
|---|---|---|
| `lib/word-craft/placement.ts` | ~120 | **NEW** (resolver + axis utils) |
| `components/word-craft/WordCraftPendingStrip.tsx` | ~140 | **NEW** |
| `components/word-craft/WordCraftAxisChip.tsx` | ~50 | **NEW** |
| `components/word-craft/WordCraftActionBar.tsx` | ~80 | **NEW** (replaces Controls) |
| `components/word-craft/WordCraftZoomShell.tsx` | ~100 | **NEW** (pinch+pan board wrapper) |
| `components/word-craft/useWordCraftDrag.ts` | 125 → ~170 | **EDIT** (lifted ghost, snap radius, haptic, spring-back) |
| `components/word-craft/WordCraftBoard.tsx` | 166 → ~180 | **EDIT** (halo-only hover, axis-hint dots, drag-pending source) |
| `components/word-craft/WordCraftRack.tsx` | 110 → ~140 | **EDIT** (scroll-snap, fast-tap when axisLocked) |
| `components/word-craft/WordCraftDragGhost.tsx` | 43 → ~70 | **EDIT** (offset, scale, GSAP spring-back) |
| `components/word-craft/WordCraftControls.tsx` | 129 | **DELETE** (replaced by ActionBar) |
| `app/[locale]/word-craft/PageClient.tsx` | existing | **EDIT** (wire shell + new state) |
| `lib/word-craft/turnReducer.ts` | existing | **EDIT** (axis-lock transitions) |

All files stay under the 300 LOC project ceiling.

### 5.4 Accessibility

- `WordCraftBoard` keeps existing `aria-label="row R column C"` per cell; adds a polite `role="status"` live region announcing `axis locked: horizontal` and `placed L at row R column C`.
- `prefers-reduced-motion`: skip pinch transform damping, drop GSAP arc to 0 ms, retain static halo highlight only.
- `vibrate(8)` is a no-op on iOS Safari; Android (≈70 % of LexiClash mobile per memory) gets the haptic.

### 5.5 i18n

~15 new translation keys × 5 locales = 75 entries. Keys: axis labels, fast-tap tooltip, recall-all, pending-strip aria, kbd help, break-axis confirm. EN authored; HE / SV / JA / ES flagged for native review on commit.

---

## 6 — Telemetry (PostHog)

New events:

- `word_craft_axis_locked` — `{ axis, turnNumber, turnId }`
- `word_craft_fast_tap_used` — `{ turnId, tilesPlaced }` (adoption metric)
- `word_craft_drag_dropped_off_axis` — `{ turnId }` (axis-break rate)
- `word_craft_pending_reorder` — `{ turnId, fromIdx, toIdx }`
- `word_craft_zoom_used` — `{ turnId, zoomLevel }` (validates pinch is worth keeping)

Existing `word_craft_turn_submitted` gains `inputMethod: 'tap' | 'drag' | 'mixed' | 'fast-tap'`.

**Success criterion**: `word_craft_fast_tap_used / word_craft_turn_submitted ≥ 0.4` over a 14-day window after public-beta rollout.

---

## 7 — Tests (TDD per `.claude/rules/22-tdd-strict.md`)

| Suite | Cases |
|---|---|
| `lib/word-craft/__tests__/placement.test.ts` | `inferAxis` (h/v/diagonal/single), `nextEmptyAlongAxis` (gaps, edges, full-row), `resolveTap` (no axis / locked / no empty), `resolveDrag` (snap / off-axis / break-lock) — ~25 |
| `components/word-craft/__tests__/useWordCraftDrag.test.ts` | offset ghost coords, snap radius, spring-back trigger, mocked haptic call, pointer-cancel cleanup |
| `components/word-craft/__tests__/WordCraftPendingStrip.test.tsx` | render, drag-reorder updates parent, ✕ recall, ✕ header recall-all, RTL mirror |
| `components/word-craft/__tests__/WordCraftRack.test.tsx` | fast-tap dispatches when axisLocked, scroll-snap layout, no fast-tap when axis null |
| `components/word-craft/__tests__/WordCraftAxisChip.test.tsx` | render h / v, tap flip, disabled when discontinuous |
| `components/word-craft/__tests__/WordCraftBoard.test.tsx` | halo on hover, no letter rendered in target cell, axis-hint dots after 1st pending, drag-pending source semantics |
| `lib/word-craft/__tests__/turnReducer.test.ts` | axis transitions, manual flip, recall-all clears axis |
| `e2e/wordcraft-mobile.spec.ts` (Playwright, mobile viewport) | full turn: drop-2-then-fast-tap, pinch-zoom, pending-strip reorder, recall-all |

Target: ~75 new tests, RED-first.

---

## 8 — Rollout

Feature flag `word-craft.mobile-redesign-v2` (PostHog).

1. **Phase 1** — ship behind flag; admin testing on `/admin/word-craft`.
2. **Phase 2** — 10 % on `/[locale]/word-craft` public beta.
3. **Phase 3** — 100 % if `fast_tap_used / turns_submitted ≥ 0.4` and Sentry crash-free.
4. Old code paths kept for ≥1 release; remove on flag retire.

---

## 9 — Edge Cases

- **Axis-locked but no empty cell on axis remaining** — fast-tap and drag drops surface inline toast *"row complete — break the line or recall a tile"*; tile stays in rack.
- **Rack tap while axis null and no rack tile selected** — selects tile (existing behavior).
- **Single pending tile recalled** — clears `anchor`, axis stays null (was already null).
- **Two pending tiles, second recalled** — `axis` resets to null, `anchor` reverts to remaining tile.
- **Manual axis-flip when current pending word would discontinue after flip** — chip shake-rejects, axis state unchanged, no placement moved.
- **Pinch-zoom while drag active** — pinch suppressed; drag wins. Single-finger pan suppressed during drag too.
- **Axis-hint dots overlapping a placed-tile neighbor** — dot rendered only on empty neighbors; placed neighbors get no dot.
- **DeviceMotion shake fires while flag off** — listener never registered; no work in handler.

---

## 11 — Out of Scope

- Board geometry changes (15×15 stays).
- Blank-tile picker (still deferred per MVP memory).
- Multi-language WordCraft dictionaries (EN-only at MVP).
- Multiplayer WordCraft.
- Server-side score validation (existing endpoint untouched).
- Shake-to-clear UX surfacing — code ships, flag stays off.

---

## 12 — References

- Existing input model: `fe-next/components/word-craft/useWordCraftDrag.ts`, `WordCraftBoard.tsx`, `WordCraftRack.tsx`
- MVP memory: `wordcraft-mvp-2026-05-04.md`
- Design system: `fe-next/.claude/docs/design-system.md`
- Responsive guidance: `fe-next/.claude/docs/responsive-design.md`
- TDD rule: `.claude/rules/22-tdd-strict.md`
- Recent juice work referenced: commits `bffbfa17b`, `239ef819c`, `c9b6652f6`
