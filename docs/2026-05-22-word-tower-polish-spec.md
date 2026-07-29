# Word Tower — Feel & Progression Polish Spec

**Date:** 2026-05-22
**Mode affected:** Solo Word Tower (`/[locale]/word-tower`)
**Status:** in progress

## Source requirements (founder, verbatim intent)

1. Tower doesn't look good enough — visual cohesion.
2. No satisfying effects when placing more letters.
3. A gap appears when starting a new word.
4. Mascot is huge and always on-screen → small + only on word placement.
5. Height-readout "section" should be smaller and to the side, like a HUD.
6. Bottom deck takes too much space and sits too close to the screen edge.
7. Missing height references — want assets + parallax so the climb *feels* like progress.
8. Letter boxes (keyboard + tower tiles) a bit smaller.
9. Make it clearer which words exist (word discoverability).
10. **(future)** Show other players' towers in the solo UI to motivate passing them.
11. Generate assets via image MCP, remove background, wire as parallax, lazy-load only when on-screen.
12. GSAP animations for those assets.
13. Player can scroll to see lower parts of the tower; on submit/add-letter, auto-scroll back to the build line (top).
14. "Make the mechanism work well with that in mind."

## Architecture facts (must respect)

- Tower is rendered in a **Pixi canvas** (`WordTowerScene` → `TowerCanvasLayer`) with a *grounded* Tower-Bloxx camera computed in `towerRowLayout()`. There is **no DOM scroll**.
- Background (`WordTowerBackdrop`) is **pure CSS/SVG** parallax keyed off `heightM` (`PX_PER_M = 5.2`). No image assets exist yet.
- Mascot (`WordTowerMascot` → `InteractiveMascot`) is **DOM**, `size="lg"` (160px), always visible.
- The tower column model (`buildTowerColumn`) **merges shared connector letters** — solo has no structural inter-word gap; the perceived gap is `rowH = size + 5%` floating tiles apart.
- No GSAP in word-tower today; juice is Pixi rAF tweens + CSS keyframes + framer-motion (mascot).
- 5 locales (he/en/sv/ja/es), Hebrew RTL primary. Reduced-motion is respected everywhere and must stay respected.
- A **versus** mode already exists (`WordTowerVersus` + `WordTowerVersusRail`) showing live rival heights + bomb mechanic. Solo shows no rivals. This is prior art for req #10.
- Pixi v8 + React Strict Mode canvas race (memory): **do not add a second Pixi mount path**. Image-parallax assets go in a **DOM layer behind the canvas**, never as new Pixi sprites.

## Key decisions (locked with advisor)

- **Scroll = Pixi camera-pan**, not DOM scroll, not GSAP. Add `userPanOffset` to the scene, driven by drag/wheel/touch, clamped `[0, fullTowerHeight − viewport]`, reset to 0 on `resultKey`/`selected` change. **Snap-to-top tween fires *before* placement FX** so the juice is on-screen.
- **#5** = compact the height chip and move it to the side; add no chrome above the build-line (satisfies both "shrink chip" and "more tower visible" readings).
- **#3 gap** = tighten `rowH` in `towerLayout` (≈2px seam) so the tower reads as one cohesive stack; keep per-word colour band + connector tint for word legibility (also helps #9).
- **Mascot** = hidden by default; pop on `resultKey` for ~1300ms then hide; `size="sm"` (112px); skip the error sulk (the founder only asked for "when player puts another word").
- **Letter boxes** = tray tiles → ~42px (keeps WCAG 2.1 AA 24px floor; below AAA 44px — acceptable for a game keyboard), smaller font; tower tiles smaller via `towerLayout` size clamp.
- **#9 word hint** = anchor-letter possibility **count** chip ("N words from ⟨anchor⟩"), derived from the already-loaded dictionary, memoised per (anchor, sorted-tray). Don't reveal the words themselves in v1.
- **#10 rivals** = **design note only** this pass; stub a `WordTowerRivalSource` interface (leaderboard top-N or friends) so phases 1–4 don't paint us in. Render later as faint ghost-silhouette towers flanking the active tower.
- **Assets** = generated via image MCP, bg removed (rembg `isnet-anime` for the kawaii style per memory), placed as DOM parallax layers behind the canvas, lazy-mounted by altitude band (IntersectionObserver / height threshold), animated with GSAP (drift/bob), reduced-motion safe. Generate **after** the scroll mechanism lands (scroll changes which bands the player dwells in).

## Phasing (each phase = one commit, ask before committing)

- **Phase 1 — Layout & cohesion (no assets):** shrink tower tiles + tighten `rowH` (#1,#3,#8); compact + reposition height chip (#5); shrink tray tiles + tighten deck spacing + bottom breathing room (#6,#8); gate + shrink mascot (#4). TDD: `towerRowLayout` size/rowH math, mascot-visibility state machine.
- **Phase 2 — Placement FX (#2):** satisfying per-letter-add feedback (tile pop + impact puff already exist for commit; add select/preview juice) and stronger word-commit reward. Pixi rAF + existing particle presets; reduced-motion safe.
- **Phase 3 — Camera pan + snap (#13,#14):** `userPanOffset` in scene; drag/wheel/touch; clamp; reset-to-top on action *before* FX. TDD: clamp + snap reducer/helper (pure).
- **Phase 5 — Word-count hint (#9):** possibility-count helper + chip near anchor. TDD: count helper (dictionary predicate + buildable-from-tray).
- **Phase 4 — Image parallax assets (#7,#11,#12):** generate band assets, rembg, DOM parallax layers behind canvas, lazy-mount by altitude, GSAP drift/bob, reduced-motion safe.
- **Phase 6 — Rival towers (#10):** design note + stubbed `WordTowerRivalSource`. No render this pass.

## Test strategy

TDD the **logic**, not pixels (per `.claude/rules/22-tdd-strict.md`): `towerRowLayout` math, mascot visibility, camera clamp/snap, word-count. Visual layout (HUD classes, asset placement) verified live via dev server (port 3001) + Playwriter, Hebrew (`?locale=he`) RTL included.

## Progress log

- **Phase 1 — DONE** (`e45787682` + `96cc1b5c0`): compact tiles (38–54px) + flush 2px seam + build line 0.15→0.28; mascot gated via `useTimedReveal`, `sm`, circle clip, word-complete only; compact start-side altitude chip; smaller tray/builder tiles; tighter deck + bottom inset. 7 tests.
- **Phase 2 — DONE** (`d86b163a0`): escalating placement juice — `squashLand` + self-cleaning `impactRing` + `letterPlacementFx` (pure, tested) scaling particles/ring with the letter's depth in the word; reduced-motion snaps instantly. 5 tests.
- **Phase 3 — DONE** (`d2fca9f49` + `17ce78628`): drag/wheel camera-pan on the Pixi container with `towerPanMin`/`clampPan` (pure, tested); auto-snap to build line on letter-add/submit (240ms snap < 440ms drop → FX on-screen); keep-window widened to the full pannable range; capture-phase pointer binding so it fires over the canvas; impact-ring z-order fix. 7 tests.
- **Phase 5 — DONE** (`016374337`): `countBuildableWords` (pure, tested) → "N words possible" Lightbulb chip; dict threaded Game→Play; `hud.possible` ×5 locales.
- **Phase 4 — DONE** (`a07174114`): 5 image-MCP assets (balloon/birds/plane/satellite/UFO) rembg'd to transparent PNGs; `parallaxProps` (pure, tested) — one altitude window drives both lazy-mount + parallax offset/fade; `WordTowerParallaxProps` DOM layer behind the Pixi canvas, next/image lazy-load, GSAP idle bob, reduced-motion safe. **Still wants founder live-verification (admin gate blocks headless).**

## Phase 6 — Rival towers (#10), design note (NOT built this pass)

Goal: in SOLO, show other players' towers so the climber wants to pass them.

Prior art: **versus mode already exists** (`WordTowerVersus` + `WordTowerVersusRail` consuming `VersusStanding { playerId, username, heightM, rank, ... }`). That's a live-multiplayer rail; solo needs *asynchronous* rivals (leaderboard top-N / friends / your own PB ghost).

Proposed shape (so future work doesn't repaint):
```ts
interface WordTowerRival { id: string; name: string; heightM: number; isYou?: boolean; }
interface WordTowerRivalSource { rivals(currentHeightM: number): WordTowerRival[]; } // leaderboard | friends | pb-ghost
```
Render: faint, non-interactive **ghost-silhouette towers** flanking the active tower (parallax-depth, behind the live tower), each with a height tick + name; a "passing!" pulse when `currentHeightM` crosses a rival's `heightM`. Feed initial data from `/api/word-tower/leaderboard` (already exists). Keep them in a DOM layer (or a separate Pixi sub-container) so they never interfere with the active-tower diff/pan.

## Out of scope / deferred

- Versus-mode changes (this is solo polish).
- Cross-session persistence beyond what already exists.
- Revealing candidate words (only the count in v1).
