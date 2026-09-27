# Blast — Candy-Crush Tiles + Popup Redesign (S2 + S3)

**Date:** 2026-05-04
**Author:** Claude (Opus 4.7) + Ohad
**Status:** Spec — pending impl plan
**Predecessors:**
- `docs/blast-vfx-upgrade-proposal.md` (effects layer — already shipped)
- `docs/2026-05-03-blast-highlight-reel-design.md` (end-of-run cinematic)
- Memory: *Blast Sprint 1+2 Shipped 2026-04-30*

## Goal

The blast effects bus is mature (BloomFilter, ShockwaveFilter, RGBSplit, ZoomBlur, screen-shake, hit-stop — all shipped). What players still call out as weak:

1. **Tiles look flat.** They read as 2D coloured boxes with a letter, not as physical candy-objects with surface, depth, and mass.
2. **Popups feel cheap.** `BlastContinueModal` and `BlastRetryWaveModal` use generic `bg-neo-navy-light` cards with `scale 0.85→1` framer transitions. They don't feel like a moment.

This spec ships **S2 (candy-crush tiles)** and **S3 (popup redesign)** as one bundle behind a single feature flag. Bug-sweep, ad-gated save, and solvability guarantee are deferred to a separate spec (S1) once concrete bugs surface during impl.

## Non-goals

- New effects/filters on top of the existing pixi bus (that bus is already comprehensive).
- Changing tile *gameplay* shape (`BlastTileType` enum, hit counts, special-tile rules stay identical).
- Touching `blastEnhancedEffects`, `BlastEffectsCanvas`, particle systems, screen-shake, hit-stop. Out of scope.
- Redesigning `BlastWaveIntro`, `BlastResultsSummary`, `BlastBragCard`, `BlastSugarCrushFinale`. Future spec.
- Audio. Existing sounds keep firing on the same beats.
- Adding any new modal/screen.

## Scope summary

| Sub-scope | Touches | Risk |
|---|---|---|
| **S2 Tiles** | `BlastTile.tsx`, `blastTileVisuals.ts`, new SCSS module, optional new SVG asset for gloss layer | Med |
| **S3 Popups** | `BlastContinueModal.tsx`, `BlastRetryWaveModal.tsx`, shared modal primitives if extracted | Low |

## Architecture

### S2 — Tile rendering

`BlastTile` stays a DOM React component (no migration to pixi sprite — pixi is for effects layer above). The tile becomes a 5-layer composite within a single `<button>`:

```
<button class="blast-tile">                       ← interaction surface, rounded, drop-shadow
  <span class="bt-shadow" />                      ← Layer 1: cast shadow (translateZ illusion)
  <span class="bt-base" />                        ← Layer 2: tile body — colour gradient + bevel border
  <span class="bt-gloss" aria-hidden />            ← Layer 3: top-half gloss (radial gradient white→transparent)
  <span class="bt-rim" aria-hidden />              ← Layer 4: inner rim-light (1px inset stroke, top-left to bottom-right gradient)
  <span class="bt-letter">{letter}</span>          ← Layer 5: letter — embossed text-shadow stack
  {badges/icons stay as siblings — multiplier ×3, portal dot, hit-counter}
</button>
```

Layer responsibilities:

- **bt-shadow** — pseudo-3D depth. CSS `transform: translateY(2px)`, `filter: blur(2px)`, `opacity: 0.45`, slightly larger than the tile so it peeks. Lifts on `:active` (translateY(0), opacity 0.2) — communicates press.
- **bt-base** — the candy body. Per-type linear gradient (top 8% darker → mid colour → bottom 12% darker). Inner box-shadow gives soft 3D rounding. Thickness `border: 2px solid` with the type's outline tone (NOT pure black — softer for the candy look).
- **bt-gloss** — specular highlight. `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55), transparent 60%)`. Sits on top of base, no pointer events. Migrates *with* the tile during phase transitions (clearing/falling/etc).
- **bt-rim** — 1px inset stroke top-left bright, bottom-right dim. Adds the "moulded" hard edge.
- **bt-letter** — keep current `font-neo-display`. Replace flat text-shadow with stacked emboss: `1px 1px 0 rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.4), 0 -1px 0 rgba(255,255,255,0.4)`.

Per-type gradient + accent colour drives all five layers via CSS custom properties, set on the button by type:

```css
.blast-tile[data-type="bomb"]       { --tile-grad-top: #ff5471; --tile-grad-bot: #c81542; --tile-rim: #ffaab8; }
.blast-tile[data-type="lightning"]  { --tile-grad-top: #fff09a; --tile-grad-bot: #f0a800; --tile-rim: #fff7d0; }
.blast-tile[data-type="diamond"]    { --tile-grad-top: #d8f6ff; --tile-grad-bot: #4ec5ff; --tile-rim: #ffffff; }
/* ...etc per BlastTileType */
.blast-tile[data-type="standard"]   { --tile-grad-top: #faf6e8; --tile-grad-bot: #d8caa6; --tile-rim: #ffffff; }
```

Existing `TILE_VISUALS` constant stays — it still drives data-attrs and badge layout. We migrate visual values from inline tailwind classes to CSS variables on the button. SCSS module `BlastTile.module.scss` co-located.

### Phase animations — squash/stretch via GSAP

Today phase transitions use ad-hoc `transition: all 120ms ease-out` on the same element. Replace with GSAP timelines hooked into `useBlastGsapTimelines` (already exists at `components/blast/hooks/useBlastGsapTimelines.ts`).

| Phase | Old | New |
|---|---|---|
| `idle → selected` | `scale(1.1)` brightness pump | GSAP `to(scale: 1.06, ease: "back.out(2)", duration: 0.18)` + saturation +10% |
| `selected → anticipation` | `scale(1.1) brightness(1.4) 120ms` | Squash: `scale(1.18, 0.82)` 80ms, then bounce settle 100ms (`elastic.out(1, 0.4)`) |
| `clearing` | random rotate + opacity fade | Anticipation squat (40ms) → big pop (`scale(1.4)`, ease `back.out(3.5)`) → fade-with-rotate exit (180ms) |
| `falling` | `translateY(fallOffset) → 0` | `gsap.to(y: 0, ease: "bounce.out", duration: 0.55)` — variable per fall distance |
| `appearing` | `translateY(spawnOffset) → 0` | `from(y: spawnOffset, scale: 0.6, opacity: 0, ease: "back.out(1.7)", duration: 0.32)` |
| `landing` | static | 60ms squash `scaleY(0.88)` then settle 80ms `elastic.out(1.5, 0.5)` |

All timelines respect `usePrefersReducedMotion()` — when reduced, fall back to CSS transitions of equivalent duration without overshoot/bounce.

### Adjacent-tile reactive lean

When a tile enters `clearing` phase, its 4 cardinal neighbours receive a brief "lean toward" tween: 80ms `gsap.to(rotate: ±4deg, x/y: ±2px)` then settle. Adds the chain-reaction feel without needing physics. Implemented via a single ref-callback fired from the parent `BlastBoard` so we don't put per-cell GSAP refs in the tile.

### S3 — Popup redesign

Two modals to redesign: `BlastContinueModal`, `BlastRetryWaveModal`. Both currently:

- Use `framer-motion` `AdaptiveMotion.div` with `initial scale 0.85` → `animate 1`.
- Render a flat `bg-neo-navy-light` rounded card, `border-neo-thick border-black`, `shadow-hard-lg`.
- Top icon = small lucide icon in a `rounded-full bg-neo-pink/cyan` circle.
- CTA = single `bg-neo-lime` button.

Goal: a *moment*. Each modal mount is its own micro-event.

#### Visual changes

1. **Backdrop.** Replace `bg-neo-navy/80` flat with a 3-layer stack:
   - `bg-neo-navy/85` base.
   - Radial vignette gradient pinned to the modal centre (`radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.45) 80%)`).
   - Backdrop-filter `blur(6px) saturate(1.1)` — supported on iOS Safari ≥9, Android Chrome ≥76; fallback no-op for older.

2. **Modal frame.** Keep `border-neo-thick`, but add a top-edge rim-light gradient strip (`linear-gradient(180deg, rgba(255,255,255,0.18), transparent 25%)`) and a bottom inner glow (`box-shadow: inset 0 -16px 24px rgba(0,0,0,0.35)`). Background changes from solid to a vertical gradient `from #1f2342 to #16213e` for subtle depth.

3. **Icon orb.** Today: 64×64 flat circle with lucide icon. New:
   - 88×88 outer ring with rotating dashed-border (CSS animation `spin 4s linear infinite`).
   - Inner gradient orb: `radial-gradient(circle, var(--accent-light), var(--accent-base))` — accent colour derived from modal intent (lime for continue, cyan for retry).
   - Icon strokes increase from `strokeWidth 3` → `3.5`.
   - On mount, GSAP timeline fires a 6-particle radial burst (existing `BlastEffectsCanvas` exposes a `firePopupBurst({x,y,colour})` method we add — fires through current particle system, no new infra).
   - Pulse glow: `box-shadow: 0 0 0 0 var(--accent-glow)` keyframed to `0 0 24px 8px transparent` on a 1.4s loop.

4. **CTA button.** Today: flat `bg-neo-lime`. New:
   - Gradient fill `linear-gradient(180deg, var(--accent-light), var(--accent-base))`.
   - Inner top highlight (1px inset white at 0.4 alpha) for the gloss read.
   - Hover: hue-shift +6deg + scale 1.02 (GSAP, not CSS, to compose with active-press).
   - Active: existing `translate-x/y[1px]` press kept.
   - On enter, button has a 200ms-delayed swipe-shine (a single linear-gradient pseudo-element animated `left: -100% → 100%` over 700ms).

5. **Decline button.** Today: full-width prominent. Reduce to centred small text-button below the CTA, no border, `text-neo-cream/55`. Removes ambiguity — Continue/Retry is the obvious primary action.

#### Motion changes

Replace `framer-motion` modal entrance with a GSAP timeline so we get full control over staggers + ease curves:

```
0.00s: backdrop fades in (180ms, linear)
0.05s: modal scales 0.7→1.0, ease back.out(1.6), 320ms
0.20s: icon orb scale 0→1, ease elastic.out(1, 0.5), 380ms — orb's pulse glow + dashed ring start here
0.30s: title slides up + fades (16px, 220ms, ease power2.out)
0.40s: body slides up + fades (12px, 200ms)
0.50s: CTA scales 0.85→1, ease back.out(2), 240ms — swipe-shine fires at 0.70s
0.55s: decline fades in (180ms)
```

Exit timeline reverses (compressed to ~250ms total). All timelines respect reduced-motion.

#### Mascot reaction (Continue modal only — small charm)

`BlastMoveWarningMascot.tsx` already exists. Wire its happy-pose variant into `BlastContinueModal` as a 56×56 sticker pinned bottom-right of the modal frame, sliding up with a 250ms delay after the modal opens. Pure CSS keyframes, no new asset (uses existing mascot GIF or PNG from `mascot-asset-paths` memory).

## Components

| File | Change |
|---|---|
| `components/blast/BlastTile.tsx` | Refactor render to 5-layer composite. Migrate inline-style transitions to GSAP via existing `useBlastGsapTimelines`. Wire data-type → CSS-var driver. ~80 LOC delta. |
| `components/blast/BlastTile.module.scss` | **NEW.** All candy-crush styling: gradient stack, gloss pseudo, rim, layered shadow. ~180 LOC. |
| `components/blast/blastTileVisuals.ts` | Extend `TILE_VISUALS` per-type to include `gradTop/gradBot/rim/accentGlow` colour quads. |
| `components/blast/BlastBoard.tsx` | Wire neighbour-lean ref-callback. ~30 LOC delta. |
| `components/blast/hooks/useBlastGsapTimelines.ts` | Add `playPhaseTransition(phase, el, opts)` API for per-tile timelines. Add `playPopupTimeline(modalRefs)` for modal orchestration. ~60 LOC delta. |
| `components/blast/BlastContinueModal.tsx` | Replace framer markup with GSAP-driven structure. ~110 LOC delta. |
| `components/blast/BlastRetryWaveModal.tsx` | Same as Continue. ~110 LOC delta. |
| `components/blast/BlastModalShell.tsx` | **NEW.** Shared structure (backdrop, frame, orb, title/body/CTA slots, GSAP timeline orchestrator). Both modals consume. ~140 LOC. |
| `components/blast/BlastModalShell.module.scss` | **NEW.** Backdrop blur, gradient frame, dashed ring, swipe-shine. ~120 LOC. |
| `components/blast/BlastEffectsCanvas.tsx` | Add `firePopupBurst({x,y,colour})` exposed via existing `BlastFxBridge` ref. ~25 LOC delta. |

No new dependencies. `gsap` and `pixi.js` are already installed.

## Data flow

### Tile

`BlastTile` props are unchanged. Phase transitions trigger GSAP timelines via `useEffect([phase])` hooked to a ref. The hook centralises kill/recreation logic so we don't leak timelines across phase rapid-fire (the existing tile already churns phases — this is a known correctness risk if we don't kill prior tweens).

### Popup

```
BlastView decides to open modal
  → setOpenModal('continue' | 'retry')
  → Modal mounts; BlastModalShell starts GSAP timeline at 0.00s
  → At 0.20s, shell calls firePopupBurst(orbCenter, accent) via context-provided fxBridge ref
  → User clicks CTA → useRewardedFeatureUnlock.offer() (existing) → ad shown → onUnlock fires onContinue/onRetry
  → Exit timeline plays (250ms), shell calls onClose when complete
  → BlastView clears modal state
```

`useRewardedFeatureUnlock` and `BlastFxBridge` exist; we don't change their contracts.

## Error handling

- **GSAP timeline overlap.** Each tile owns one timeline ref; on phase change, prior `tl.kill()` runs before creating new. Same pattern in `BlastModalShell` for icon-orb timeline.
- **Missing fxBridge ref** (test environments). `firePopupBurst` no-ops if the canvas isn't mounted. Modal still works, no burst.
- **Reduced-motion.** Single guard: `usePrefersReducedMotion()` is read once per tile and once per modal at mount. When `true`, replace timelines with `gsap.set` (instant) + a 120ms opacity-only fade where the timeline would have been. No bouncy/elastic eases.
- **Backdrop blur unsupported.** Detection via `CSS.supports('backdrop-filter','blur(6px)')`. Fallback drops blur, raises backdrop opacity to `0.92` for compensation.
- **CSS gradient unsupported (truly ancient devices).** The `linear-gradient` fallback IS the current `bg-neo-navy-light`, so the tile body just looks like today on those devices. No regression.

## Testing

### Unit (Vitest)

| Test file | Covers |
|---|---|
| `components/blast/__tests__/BlastTile.candyVisual.test.tsx` (new) | Layer composition: shadow/base/gloss/rim/letter all render. Per-type CSS-var on `data-type`. Reduced-motion path skips GSAP. |
| `components/blast/__tests__/BlastTile.test.tsx` (existing — extend) | Existing tests must still pass against new render shape. Update snapshot. |
| `components/blast/hooks/__tests__/useBlastGsapTimelines.test.ts` (existing — extend) | New `playPhaseTransition` and `playPopupTimeline` covered, including kill-on-phase-change. |
| `components/blast/__tests__/BlastModalShell.test.tsx` (new) | Shell renders backdrop+frame+orb+slots, fires burst at 0.20s, exit timeline calls onClose. |
| `components/blast/__tests__/BlastContinueModal.test.tsx` (new — none today) | Mount fires popup timeline, CTA path → useRewardedFeatureUnlock.offer, decline path → onDecline, mascot reaction renders. |
| `components/blast/__tests__/BlastRetryWaveModal.test.tsx` (existing — extend) | Same as Continue minus mascot. |

### Integration

`BlastView.retryWave.test.tsx` already exists — extend to assert new modal shell mounts and exit timeline runs before `onRetry` fires.

### Visual snapshots

`BlastMobileResponsive.test.tsx` (existing) is the snapshot anchor. Re-record after change. Add new entries for `data-type` per `BlastTileType` so candy gradients are explicitly captured.

### Manual playtest checklist

- [ ] iOS Safari (iPhone 13/15) — backdrop-filter blur works, no jank on tile-fall (60fps on 6×6 grid + 30 falling tiles).
- [ ] Android (Pixel 6, mid-tier Samsung A-series) — bevel reads cleanly at 360px viewport width, no banding on gradient.
- [ ] CrazyGames iframe — modal swipe-shine doesn't tear; backdrop blur OK or graceful fallback.
- [ ] RTL (Hebrew) — gloss highlight stays at top centre regardless of writing direction; modal layout mirrors correctly.
- [ ] Reduced-motion preference — no bouncy eases, no swipe-shine, no dashed-ring spin.
- [ ] TV/desktop large viewport — gloss doesn't tile-pattern; edges of gradient still look molded.

### Perf budget

- Tile gradient stack adds ~3 paint layers per tile × 36 = 108 layers. Browsers will batch — measured target: tile-render ≤2ms per frame on Android Pixel 6.
- Backdrop blur: one `backdrop-filter: blur(6px)` is the heavy cost. Measure first frame after modal open ≤16ms total on mid-tier Android. If exceeded, drop blur radius to 3px or compose modal as background image of pre-blurred screenshot.

## Feature flag

`blast.candy-shell.enabled` — single flag toggling both S2 and S3. PostHog feature flag, default off in prod, default on in dev. Allows quick rollback if perf regresses.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| GSAP timeline leak on rapid phase change | Med | Test covers kill-on-phase-change. Use `gsap.context()` scoped to tile element so unmount cleans automatically. |
| CSS gradient banding on Android low-end | Med | Add 1% noise SVG overlay on tile base — `background-blend-mode: overlay`. Defer to playtest. |
| Modal swipe-shine creates layout shift in CG iframe | Low | Pseudo-element absolute-positioned with `overflow: hidden` parent — already standard pattern. |
| Snapshot churn breaks CI | Low | Pre-flag snapshots gated behind flag-state. Two snapshot sets coexist briefly. |
| Backdrop-filter cost on iPhone SE 1st gen / Android Go | Low | Detection fallback to opacity-only backdrop. |
| Rendering cost on the new layered tile blocks the existing 60fps cascade | Med | Convert `bt-shadow` and `bt-gloss` to `transform: translateZ(0)` GPU-promoted layers. Validate via `chrome://gpu` profile. |

## Open questions to resolve during impl

- Whether `BlastTile.module.scss` needs container queries (per `responsive-design.md`) — likely yes for tile-internal padding/letter-size scaling. Decide at scaffolding step.
- Whether the icon-orb dashed-ring should counter-rotate in RTL — visual decision, hold for first build.
- Mascot pose asset path — confirm `mascot-asset-paths` memory entry covers a happy/cheering pose; if not, crop existing GIF.

## Out of scope (future specs)

- **S1.** Bug sweep + ad-gated checkpoint save + initial-board solvability guarantee. Concrete bugs to be enumerated during S2+S3 impl, then specced.
- **S4.** Board-level juice not present today — slow-mo on big clears, pointer goo-trail, advanced filter combos.
- **S5.** Atmosphere — DisplacementFilter background, audio-coupled tile pulse, vertex shader letter dissolve.
- Tile body migration to PixiJS sprite (`Sprite + BevelFilter + DropShadowFilter`). Considered and rejected: existing DOM tile composites with the effects-canvas overlay are cheaper, accessible, and good enough at a candy-crush feel with the layered SCSS approach.

## i18n

Two new visible strings if mascot reaction includes a tooltip caption. If we keep mascot mute (recommended), zero new strings. All other text comes from existing modal copy keys (`blast.continueModal.*`, `blast.retryWaveModal.*`).

## Acceptance criteria

- [ ] Tile reads as a moulded candy at 360px and 1920px viewports — visible top gloss, rim-light, cast shadow.
- [ ] Pressing/selecting a tile triggers visible squash-then-overshoot, not a flat scale.
- [ ] Clearing a tile makes its 4 neighbours lean toward it, then settle.
- [ ] Continue and Retry modals open with backdrop blur + gradient frame + dashed-ring orb + sequential element stagger.
- [ ] CTA button has gloss + swipe-shine on mount.
- [ ] All five locales (en/he/sv/ja/es) render correctly; HE mirrors layout.
- [ ] Reduced-motion preference flattens all bouncy eases to opacity-only fades.
- [ ] All existing blast tests stay green; new tests added for new behaviours.
- [ ] `npm run lint && npm run test && npm run build` all pass.
- [ ] PostHog flag `blast.candy-shell.enabled` toggles between old and new presentation cleanly.
