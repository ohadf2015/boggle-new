# WordCraft Mobile-Fun Pass — Design Spec

**Date:** 2026-05-11
**Owner:** Ohad Fisher
**Status:** Design approved — ready for implementation plan
**Scope:** Make the public WordCraft mode mobile-readable and "alive" via adaptive board geometry, redesigned tile chrome, Pixi+GSAP juice overlay, and tap-tap-first placement. Removes the admin-only route entirely.

---

## 0 — Relationship to prior specs

| Doc | Status under this spec |
|-----|------------------------|
| `2026-05-10-wordcraft-mobile-redesign-design.md` (input mechanics) | **Partially superseded.** That spec declared "15×15 board sacred"; this spec changes board geometry. Its tap-tap + drag-coexistence model is still adopted (§5 here mirrors §4 there). |
| `wordcraft-mvp-2026-05-04` memory entry | Becomes historical. After ship, a new memory entry `wordcraft-mobile-fun-2026-05-11.md` records the shipped state. |

**Implementation note:** Explore-agent finding said current code is **13×13**; the prior spec assumed 15×15. Confirm actual dimension in `lib/word-craft/board.ts` during plan/RED phase before refactor — adapt all 13→variable-dim work to whatever ships today.

---

## 1 — Problem

WordCraft today is a DOM 13×13 grid with GSAP juice. On phones:

- ~25px tiles after pinch-out → letter, score number, and DL/TL/DW/TW labels all fight for the same ~600 pixels per cell. Players zoom in to read, zoom out to plan, zoom in to tap — friction.
- No ambient life. Board feels static between turns. Submit-success → small GSAP score float; otherwise silent.
- 100-tile bag on 13×13 = ~70% fill = long endgame on phone sessions (target session 6–8 min for mobile).
- 812-line `app/[locale]/word-craft/PageClient.tsx` violates `max 500 lines` rule.
- Admin route `app/[locale]/admin/word-craft/` is a dev artifact, no longer needed.

Goal: mobile-readable board, fun feel, modest scope, no test regressions.

---

## 2 — Locked decisions (from brainstorm)

| # | Decision | Rationale |
|---|---|---|
| D1 | Delete admin route entirely | WordCraft graduates from admin-gated demo to public mode. |
| D2 | Adaptive board: 11×11 phone / 13×13 tablet+ | Phone ~33px tiles legible; tablet+ keeps Scrabble parity. Dim locked at game start by viewport — no mid-game resize. |
| D3 | Pixi overlay always-on | Ambient sparkles on premium squares + center pulse; event-driven ripples, particle waves, score arcs, confetti. |
| D4 | Tile chrome: big letter (~70% cell) + corner color dot | Score dot tier: `common` (1pt) gray · `mid` (2–3) cyan · `rare` (4–5) purple · `legendary` (8–10) gold. |
| D5 | Premium squares: brand-tint backgrounds, no DL/TL/DW/TW labels | TW=pink · DW=lime · TL=cyan · DL=purple (project brand palette per `.impeccable.md`). Legend chip lives in HUD. |
| D6 | Mobile placement: tap-tap default, drag still works | Tap rack tile → tap board cell. Pixi shows arc preview. Drag stays for desktop + power users. |
| D7 | Phone-only 78-tile bag, proportional distribution | ~64% phone-board fill. High-value tiles ≥1 floor. Tablet+ keeps 100-tile Scrabble bag. |
| D8 | Architecture: shared coord hook + sibling Pixi canvas | DOM owns layout. `useBoardCoords` is single source. Matches BlastEngine imperative-Pixi precedent. |

---

## 3 — Architecture

```
WordCraft public page
└── PageClient (slimmed to <500 lines)
    ├── WordCraftHUD                       NEW — extracted; score + turn + legend chip
    ├── WordCraftBoardSection              NEW — wraps board + Pixi overlay
    │   ├── WordCraftZoomShell             (existing, max-zoom 2.4 → 2.0)
    │   │   ├── WordCraftBoard             (existing, dims-prop)
    │   │   │   └── boardRef ─────────────┐
    │   │   └── WordCraftPixiStage   NEW  │  reads coords
    │   │       ├── ambientLayer          │
    │   │       └── eventLayer            │
    │   └── useBoardCoords(boardRef) ─────┘  ResizeObserver + rect cache
    ├── WordCraftRack                      (existing)
    ├── WordCraftPendingStrip              (existing)
    └── WordCraftGameOverScene             NEW — extracted

lib/word-craft/
├── board.ts              (modified — accept dims)
├── boardDimensions.ts    NEW — viewport → {rows, cols, premiumPattern, bagSize}
├── placement.ts          (modified — accept dims)
├── scoring.ts            (modified — accept dims)
├── tileBag.ts            (modified — dispatch by bagSize)
├── tileBag.phone.ts      NEW — 78-tile distribution
├── scoreDotTier.ts       NEW — points → tier
└── pixi/
    ├── ambientSparkles.ts        NEW
    └── scenes/
        ├── tilePlaceRipple.ts    NEW
        ├── wordCommitWave.ts     NEW
        ├── scoreConfetti.ts      NEW
        └── botMoveReveal.ts      NEW
```

### Coordinate ownership

`useBoardCoords(boardRef)` owns rect math. API:

```ts
type BoardCoords = {
  cellRect(row: number, col: number): DOMRect | null;
  bagRect(): DOMRect | null;
  scoreChipRect(): DOMRect | null;
  subscribe(listener: () => void): () => void;  // notify on resize
};
```

`ResizeObserver` on `boardRef.current` invalidates the rect cache. Pixi reads via `cellRect` per scene tick — cheap because cache is precomputed, not measured per call.

### Pixi stage lifecycle

`WordCraftPixiStage`:
- `useEffect` mounts `new PIXI.Application({ resizeTo: boardRef.current, backgroundAlpha: 0 })` once.
- Ambient layer = persistent `PIXI.Container` (sparkles on premium-square coords + center pulse via `gsap.to`).
- Event layer = scenes pushed by submit-success / tile-place / bot-move / game-end signals from game state (subscribed via game context).
- `prefers-reduced-motion: reduce` listener: ambient skipped, event scenes degrade to instant flash (no particles).
- Unmount destroys app with `{ removeView: true }` to avoid canvas leak on route nav.

### Pixi+DOM coexistence

- DOM grid `pointer-events: auto`; Pixi canvas `pointer-events: none`. All input via DOM (a11y + existing drag/tap handlers preserved).
- Pixi z-index above grid cells, below pending-strip & HUD.
- RTL: DOM handles; Pixi reads same `cellRect` so direction-correct automatically.

---

## 4 — Tile + premium-square chrome

### Tile (placed)
- Letter at ~70% of cell, bold, brand font (Fredoka).
- Corner dot bottom-right (LTR) / bottom-left (RTL), 4px diameter, color = `scoreDotTier(points)`.
- No visible score number on the cell. Long-press tile → tooltip `wordcraft.scoreDot.<tier>` (`"10 points — legendary tile"` etc.).

### Premium square (empty)
- Background tint only. Tailwind brand classes:
  - `bg-brand-pink/15` for TW
  - `bg-brand-lime/15` for DW
  - `bg-brand-cyan/15` for TL
  - `bg-brand-purple/15` for DL
  - Center `★` cell: `bg-brand-pink/25` + larger star glyph.
- No DL/TL/DW/TW text labels on the cell. Legend chip in HUD shows mapping persistently.

### Score-dot tier map

| Tier | Points | Color |
|------|--------|-------|
| common | 1 | `--brand-gray-400` |
| mid | 2–3 | `--brand-cyan-400` |
| rare | 4–5 | `--brand-purple-500` |
| legendary | 8–10 | `--brand-gold-400` |

---

## 5 — Mobile placement flow

### Default (touch pointer detected)
1. Tap rack tile → marked `selected`; Pixi ambient dims, selected DOM tile gets gold halo (GSAP scale 1→1.08 loop).
2. Tap empty board cell → game commits placement; Pixi `tilePlaceRipple` plays (~250ms). DOM tile renders with `tilePlace` GSAP juice (existing).
3. Tap placed-pending tile → returns to rack (existing recall behavior).

### Drag fallback (mouse/pen pointer OR explicit drag gesture detected by `useWordCraftDrag`)
- Existing drag path retained. Same final state.

### Pointer detection
`useWordCraftDrag` already reads `pointerType`. New behavior: `touch` pointers route through tap-tap unless a drag-threshold (>6px) is crossed within the rack pickup. Mouse/pen stays drag-first.

---

## 6 — Pixi scenes

| Scene | Trigger | Duration | Particles | RM fallback |
|-------|---------|----------|-----------|-------------|
| `ambientSparkles` | always-on | persistent | 1 sparkle per premium square, slow drift, ~12 active | none (skipped entirely) |
| `centerPulse` | always-on | persistent | star glyph scale 1↔1.06 loop | none |
| `tilePlaceRipple` | tile committed to cell | 250ms | ring expand + 4 micro-stars | instant 1-frame flash |
| `wordCommitWave` | valid submit | 600ms | particle wave along word path, color = sum-tier of word | instant flash, no particles |
| `scoreArc` | valid submit | 400ms | gold bezier from word centroid → HUD `scoreChipRect()` | instant chip bump |
| `scoreConfetti` | valid submit AND score ≥ 30 | 1200ms | screen confetti, 60 particles | skipped |
| `botMoveReveal` | bot turn played | 120ms × N tiles | per-tile drop with shadow | instant flash per tile |
| `gameOverBurst` | game end | 1800ms | finale confetti + winner glow | skipped |

All scenes share a `SceneCtx` (Pixi app, coord hook handle, RM flag) and a `play()` Promise so the game loop can `await` if needed.

---

## 7 — Game-state changes

### `getBoardDims(viewport)`
```ts
function getBoardDims(viewportWidth: number): BoardDims {
  const phone = viewportWidth < 768;
  return phone
    ? { rows: 11, cols: 11, premiumPattern: PREMIUM_11x11, bagSize: 78 }
    : { rows: 13, cols: 13, premiumPattern: PREMIUM_13x13, bagSize: 100 };
}
```
- Called once at game-init (in `useWordCraftGame`).
- Dim locked into game state — never re-evaluated mid-game.
- Stored alongside `gameId` so test/replay deterministic.

### `PREMIUM_11x11`
Lives in `lib/word-craft/boardDimensions.ts` alongside `PREMIUM_13x13` (extracted from current `board.ts`). Smaller premium-square set, 4-way mirrored quadrants, ~12 premiums total (vs 17 on 13×13). Layout authored as a `(PremiumKind|null)[][]` 2D constant; placement logic unchanged — `placement.ts` reads pattern via `dims.premiumPattern`.

### `tileBag.phone.ts` distribution
Frequencies preserved proportionally where viable; high-value floor = 1; blank tiles preserved at 2. **Sum is exactly 78** (verified).

| Letter | Scrabble (100) | Phone (78) |
|--------|----------------|------------|
| E | 12 | 8 |
| A | 9 | 7 |
| I | 9 | 7 |
| O | 8 | 6 |
| U | 4 | 3 |
| N | 6 | 5 |
| R | 6 | 5 |
| T | 6 | 5 |
| S | 4 | 3 |
| L | 4 | 3 |
| D | 4 | 3 |
| G | 3 | 2 |
| M | 2 | 2 |
| B | 2 | 2 |
| C | 2 | 2 |
| H | 2 | 2 |
| P | 2 | 2 |
| F | 2 | 1 |
| V | 2 | 1 |
| W | 2 | 1 |
| Y | 2 | 1 |
| K | 1 | 1 |
| J | 1 | 1 |
| X | 1 | 1 |
| Q | 1 | 1 |
| Z | 1 | 1 |
| blank | 2 | 2 |
| **Total** | **100** | **78** |

Test `tileBag.phone.test.ts` asserts: sum === 78, all 26 letters present, blanks === 2, every letter ≥ 1 floor.

---

## 8 — Error handling

| Case | Handling |
|------|----------|
| Pixi `Application` init throws (no WebGL, very old device) | catch in `WordCraftPixiStage` useEffect → PostHog `wordcraft_pixi_init_failed` + `userAgent` prop → game continues DOM-only. No user-facing error. |
| `useBoardCoords` called after unmount | `boardRef.current` null-guard, early return null. |
| Resize between rect cache and Pixi tick | One stale frame at worst; ResizeObserver invalidates next frame. Acceptable. |
| RM media-query flips mid-session | `matchMedia('(prefers-reduced-motion: reduce)')` listener → ambient layer detach/attach live. Event scenes check flag at trigger time. |
| Route navigation away mid-scene | Pixi `destroy({ removeView: true })` runs in unmount cleanup → in-flight `gsap.to` killed via scene-local `gsap.context()` revert. |

---

## 9 — Testing

### Existing 27 tests must stay green

- `WordCraftIntegration.test.tsx`, `WordCraftBoard.reticle.test.tsx`, `useWordCraftJuice.test.ts`, `WordCraftZoomShell.test.tsx`, `wordCraftTelemetry.test.ts`, etc.
- Updates required:
  - Tests asserting premium-square text (`DL`/`TL`/`DW`/`TW`) → swap to `bg-brand-*` class assertion.
  - Tests hardcoding `13` → parameterize via `dims` prop or default to 13×13 (tablet preset).

### New tests

| File | Coverage |
|------|----------|
| `lib/word-craft/__tests__/boardDimensions.test.ts` | viewport→dims mapping, phone/tablet boundary at 768, locked-after-init |
| `lib/word-craft/__tests__/tileBag.phone.test.ts` | sum = 78, high-value floor ≥ 1, blank tiles = 2, frequencies preserve order |
| `lib/word-craft/__tests__/scoreDotTier.test.ts` | 1→common, 2,3→mid, 4,5→rare, 8,10→legendary, 0→common, undefined→common |
| `components/word-craft/__tests__/useBoardCoords.test.ts` | rect cache invalidation on resize, null-after-unmount, subscriber notify |
| `components/word-craft/__tests__/WordCraftPixiStage.test.tsx` | mounts canvas, unmounts cleanly, init-failure fallback (mock Pixi throws), RM flag skips ambient |
| `lib/word-craft/pixi/__tests__/scenes.smoke.test.ts` | each scene's `play()` resolves without throw under mocked Pixi app + JSDOM canvas |

### Not in scope

- Pixel snapshot tests on Pixi visuals. Manual review on real device + screenshots in PR.

---

## 10 — i18n

| Key family | Keys | Locales |
|------------|------|---------|
| `wordcraft.legend.title` + `.tw/.dw/.tl/.dl` | 5 | en, he, ja, es, sv |
| `wordcraft.scoreDot.common/mid/rare/legendary` | 4 | × 5 = 20 |
| Removed: `wordcraft.premium.DL/TL/DW/TW` cell labels | -4 | × 5 = -20 |

Net: +5 keys × 5 locales = 25 new strings, 20 removed = **+5 net**.

HE/JA/ES/SV AI-translated, then flagged for native review per project convention. EN copy approved at design time:

- `wordcraft.legend.title` — "Bonuses"
- `wordcraft.legend.tw` — "TW · ×3 word"
- `wordcraft.legend.dw` — "DW · ×2 word"
- `wordcraft.legend.tl` — "TL · ×3 letter"
- `wordcraft.legend.dl` — "DL · ×2 letter"
- `wordcraft.scoreDot.common` — "1 point"
- `wordcraft.scoreDot.mid` — "2–3 points"
- `wordcraft.scoreDot.rare` — "4–5 points"
- `wordcraft.scoreDot.legendary` — "8+ points"

---

## 11 — Migration / cleanup

1. Delete `app/[locale]/admin/word-craft/` directory (PageClient.tsx + page.tsx).
2. `grep -r "admin/word-craft"` across repo → remove from admin nav config, audit/dashboard refs, any internal links.
3. Confirm no production `Link` to admin route remains.
4. Memory entry `wordcraft-mvp-2026-05-04.md` stays as history. After ship, add `wordcraft-mobile-fun-2026-05-11.md` index entry summarizing shipped state.

---

## 12 — Out of scope (explicit YAGNI)

- Online multiplayer / matchmaking
- Server-side score revalidation (current client-trust model unchanged)
- ELO / ranked ladder
- Blank-tile letter-picker UX improvements
- Daily-puzzle integration
- Animation editor or in-game settings for FX intensity
- Replacing DOM grid with Pixi-rendered board (rejected in §1 brainstorm)

---

## 13 — Success criteria

1. Phone (`viewport < 768`) renders 11×11 board with ≥33px effective tile size at default zoom — no pinch-zoom required to read letters or score-dot colors.
2. Tap rack tile → tap empty cell places tile end-to-end on phone without dragging — within 2 frames of the second tap.
3. Pixi overlay present on game start with ambient sparkles on premium squares — visible in Chrome dev tools as a sibling canvas to the DOM grid.
4. Valid-word submit triggers `wordCommitWave` + `scoreArc` reaching HUD score chip — verified manually on phone + desktop.
5. `prefers-reduced-motion: reduce` set → no ambient particles, no confetti, instant flashes only.
6. `app/[locale]/admin/word-craft/` no longer exists; no broken links in admin nav.
7. `app/[locale]/word-craft/PageClient.tsx` ≤ 500 lines.
8. All existing 27 WordCraft tests + 6 new test files (per §9) pass; full repo `npm run lint && npm run test && npm run build` green.

---
