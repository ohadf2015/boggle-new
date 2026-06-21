'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ChevronsUp } from 'lucide-react';
import { Container } from 'pixi.js';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
import { CONFETTI_BURST, COMBO_FLASH, GOLD_STARS } from '@/lib/gameEngine/presets/particles';
import { biomeForHeight, type WordTowerFloor, type ApplyResult } from '@/lib/wordTower/wordTowerManager';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import { buildTowerColumn, cellAltitudes, wordColor } from '@/lib/wordTower/towerColumn';
import { gradeBlockColor, blockSurface, ZONE_MATERIAL, type BlockSurface, type ZoneMaterialPalette } from '@/lib/wordTower/blockGrade';
import { viewAltitudeFor } from '@/lib/wordTower/viewAltitude';
import { biomeBlendAt } from '@/lib/wordTower/biomeBlend';
import { letterPlacementFx } from '@/lib/wordTower/placementFx';
import { swayAngleAt, swayJitterDeg } from '@/lib/wordTower/towerSway';
import { useTowerUpgradeStore } from '@/lib/wordTower/useTowerUpgradeStore';
import { swivelStartDeg, swivelDurationMs } from '@/lib/wordTower/swivelDrop';
import { toppleCrashFx } from '@/lib/wordTower/crashFx';
import { towerRowLayout, towerPanMin, clampPan } from '@/lib/wordTower/towerLayout';
import { stepMomentum, clampFlickVelocity, WHEEL_SCALE } from '@/lib/wordTower/scrollMomentum';
import {
  makeTile, paintTile, placeInstant, dropIn, popOut, recolor, swivelWordIn, shakeX, squashLand, impactRing, bumpScale,
  type TileSprite,
} from './towerSprites';
import { shaftWindX } from '@/lib/wordTower/shaftWind';
import { resonanceSchedule } from '@/lib/wordTower/resonance';
import { BIOME_THEME } from './biomeTheme';
import { WordTowerBackdrop } from './WordTowerBackdrop';
import { WordTowerParallaxProps } from './WordTowerParallaxProps';
import { WordTowerSighting } from './WordTowerSighting';
import { WordTowerMascot } from './WordTowerMascot';
import { WordTowerMinimap } from './WordTowerMinimap';
import type { RivalMarker } from '@/lib/wordTower/rivals';
import type { PlacementQuality } from '@/lib/wordTower/cranePlacement';

/** Pixi particle presets carry bare 6-char hex strings ('00ffff'); the biome
 *  palettes are hex ints. Convert int → bare-hex string for `burst({colors})`. */
const toHexStr = (n: number): string => (n & 0xffffff).toString(16).padStart(6, '0');

interface SceneProps {
  floors: WordTowerFloor[];
  biomeId: WordTowerBiomeId;
  /** Current altitude in metres — drives the parallax ascent backdrop. */
  heightM: number;
  /** Word being built (anchor + selected) — drawn as a ghost preview on top. */
  pendingWord: string;
  /** Bumps each accepted word — fires the celebration FX. */
  resultKey: number;
  /** Bumps each rejected word — shakes the pending stack. */
  errorKey: number;
  lastResult: ApplyResult | null;
  /** Quality of the latest crane drop (perfect/good/sloppy/miss) — drives the
   *  colour-coded landing FX so the player SEES whether they did good/ok/bad,
   *  not just reads a label. Paired with `resultKey` (the fire trigger). */
  dropQuality?: PlacementQuality;
  reducedMotion?: boolean;
  /** Height (px) of the bottom control deck — the tower grounds just above it. */
  bottomInsetPx?: number;
  /** Anchor length (1 or 2) — how many leading pending chars are the connector. */
  anchorLen?: number;
  /** Active tower-skin material palette (six zone colours). Defaults to classic. */
  palette?: ZoneMaterialPalette;
  /** Personal best (m) — drawn as a tick on the minimap. */
  personalBestM?: number;
  /** Rival records — drawn as ticks on the minimap (who's still above you). */
  rivals?: RivalMarker[];
  /** Translator — for the minimap + back-to-top affordance labels. */
  t?: (key: string, params?: Record<string, string | number>) => string;
  /** Fires with the altitude the camera is *looking at* (live height, or lower
   *  while panned) so sibling layers — landmark + rival rails — track the scroll
   *  too instead of freezing at the live height and leaving blank sky on the way
   *  down. Throttled to one call per animation frame. */
  onViewAltChange?: (alt: number) => void;
  /** Visible tower lean (deg, clamped ±LEAN_MAX_DEG) — recent-weighted from the
   *  crane drops. 0 = upright. Applied to the Pixi tower container's angle so the
   *  player SEES instability accumulate before the topple lands. */
  leanDeg?: number;
  /** Bumps when a CLUTCH SAVE lands (a clean drop pulled back from a critical
   *  lean) — fires the triumphant snap-back burst + bass-thud shake. */
  clutchSaveKey?: number;
  /** Bumps on a NEAR MISS (a drop that barely avoided a topple) — reserved for
   *  the near-miss FX; accepted here so the producer in WordTowerPlay type-checks. */
  nearMissKey?: number;
  /** Bumps on every hazard/topple strike — fires the crash FX so a collapse is
   *  SEEN + FELT, not just announced by the banner. */
  toppleKey?: number;
  /** Floors lost in the latest topple — scales the crash (shake/debris/flash). */
  toppleFloors?: number;
  /** How unstable the tower is (0..1). Above the sway gate the whole tower
   *  SWINGS continuously around its base — felt as menace, and (via the crane's
   *  matching offset) it moves the landing target so placing is genuinely harder.
   *  0 = rock-steady, no sway. */
  instability?: number;
}

/** Shared camera-pan state between the DOM gesture layer and the Pixi layer. */
interface PanState {
  /** Current pan offset applied to the tower container (always ≤ 0). */
  y: number;
  /** Most-negative offset allowed (reveals the base); 0 when the tower fits. */
  panMin: number;
  /** Grounded climb-follow offset (px) applied to the container alongside pan. */
  shift: number;
  /** True while the user is actively dragging (suppresses the auto-snap). */
  dragging: boolean;
  /** The live tower container (set on mount). */
  container: Container | null;
  /** DOM wrapper for the backdrop + props — panned at a fraction of the tower
   *  so the background parallaxes with the user's scroll, not just the climb. */
  bgEl: HTMLDivElement | null;
}

/** Fraction of the user's pan applied to the background (parallax — bg slower). */
const BG_PAN_DEPTH = 0.4;

/** Max pending-preview ghost bricks drawn at the crown while spelling. Founder
 *  ask (2026-06-20): "the tower should always display max 2 top letter blocks —
 *  here you can see around 5." Capping the live preview keeps the tower's crown
 *  clean; the full word still reads in the wheel hub + on the carried girder. */
const MAX_PENDING_PREVIEW = 2;

/** How far the user must scroll down (px) before the back-to-top button shows. */
const BACK_TO_TOP_REVEAL_PX = 90;

/** One live row in the unified (committed ++ pending) stack. */
interface LiveCell {
  key: string;
  pos: number; // position from the bottom — stable registry key
  char: string | null;
  color: number;
  /** Zone decoration for this tile — by the biome at its OWN altitude. */
  surface: BlockSurface;
  pending: boolean;
  shared: boolean;
}

/** Ease the tower container back to the build line. Bails if the user grabs it
 *  mid-snap (cancelled) or the container is torn down. */
function snapContainerY(c: Container, toY: number, dur: number, cancelled: () => boolean): void {
  const fromY = c.y;
  if (Math.abs(fromY - toY) < 0.5) { c.y = toY; return; }
  const t0 = performance.now();
  const ease = (k: number) => 1 - Math.pow(1 - k, 3);
  const tick = () => {
    if (c.destroyed || cancelled()) return;
    const k = Math.min(1, (performance.now() - t0) / dur);
    c.y = fromY + (toY - fromY) * ease(k);
    if (k < 1) requestAnimationFrame(tick);
    else c.y = toY;
  };
  requestAnimationFrame(tick);
}

/**
 * Imperatively draws the vertical letter-chain into the Pixi camera via a keyed
 * sprite registry (NO teardown per render): newcomers drop in, the connector
 * recolours in place, removed pending tiles pop out, survivors slide. Fires the
 * per-word celebration FX, and offsets the whole stack by the user's pan.
 */
function TowerCanvasLayer({ floors, biomeId, pendingWord, resultKey, lastResult, dropQuality, reducedMotion, bottomInsetPx = 220, anchorLen = 1, leanDeg = 0, clutchSaveKey = 0, toppleKey = 0, toppleFloors = 1, instability = 0, palette = ZONE_MATERIAL, panState }: SceneProps & { panState: MutableRefObject<PanState> }) {
  const engine = useGameEngine();
  const containerRef = useRef<Container | null>(null);
  const registry = useRef<Map<string, TileSprite>>(new Map());
  const firstRender = useRef(true);
  const prevMaxPos = useRef(-1);
  const prevSnapKey = useRef('');
  // Shaft-wind needs the live geometry from the diff effect in the rAF tick.
  const centerXRef = useRef(0);
  const topPosRef = useRef(0);
  // Suppress wind after a commit until the swivel (which owns the new tiles' x)
  // finishes — duration-derived, NOT a fixed guess, so long words can't jump.
  const lastCommitRef = useRef(0);
  const commitDurRef = useRef(0);

  // One persistent container for the whole tower.
  useEffect(() => {
    const ps = panState.current; // stable object for the component's life
    const c = new Container();
    c.sortableChildren = true;
    c.y = ps.shift + ps.y;
    engine.camera.addChild(c);
    containerRef.current = c;
    ps.container = c;
    const reg = registry.current;
    return () => {
      ps.container = null;
      try { c.destroy({ children: true }); } catch { /* */ }
      containerRef.current = null;
      reg.clear();
      firstRender.current = true;
      prevMaxPos.current = -1;
    };
  }, [engine.camera, panState]);

  // Diff the visible window of the column against the live sprite registry.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    const { width: W, height: H } = engine;
    const centerX = W / 2;
    centerXRef.current = centerX; // shaft-wind tick reads this

    // Build the unified bottom→top stack: committed letters/bricks + pending ghosts.
    const committed = buildTowerColumn(floors);
    const C = committed.length;
    // Grounded camera: base stands on the deck, stack grows up, camera pans once
    // the committed tower (NOT the pending preview) overflows the window.
    const { size, half, rowH, centerY, baseCenter, shift } = towerRowLayout({ pinCount: C, H, bottomInsetPx });
    // RIGID STACK: every tile sits at a FIXED local y (no shift) so tiles never
    // move relative to each other. The climb-follow (shift) and the user pan are
    // applied ONLY to the whole container (container.y = shift + pan) — so an
    // inter-tile gap is impossible; the column always moves as one piece.
    const localY = (pos: number) => baseCenter - pos * rowH;
    const panMin = towerPanMin(centerY(0), H, bottomInsetPx, half);
    panState.current.panMin = panMin;
    panState.current.shift = shift;
    // Grade every committed tile by the biome at ITS OWN altitude (the tower
    // spans city→space at once): the base reads bright-and-built, the top dim-
    // and-neon, with the zone shifting continuously as you scroll the column.
    const alts = cellAltitudes(floors);
    const pendingColor = wordColor(floors.length);
    const topSurface = blockSurface(biomeId);
    // Skip the anchor (pendingWord[0]) when it's already the committed top.
    // Cap the live ghost preview to the first MAX_PENDING_PREVIEW bricks so a long
    // word doesn't grow a tall column of blocks above the crown (the full word is
    // shown in the wheel hub + carried on the crane girder). Stable positions →
    // the diff registry keeps each preview brick's char fixed as the word grows.
    const pchars = (C === 0 ? Array.from(pendingWord) : Array.from(pendingWord).slice(anchorLen))
      .slice(0, MAX_PENDING_PREVIEW);

    const live: LiveCell[] = committed.map((cell, i) => {
      const zone = biomeForHeight(alts[i] ?? 0);
      return {
        key: `s${i}`,
        pos: i,
        char: cell.kind === 'letter' ? cell.char : null,
        color: gradeBlockColor(cell.color, zone, palette),
        surface: blockSurface(zone),
        pending: false,
        shared: cell.kind === 'letter' ? cell.shared : false,
      };
    });
    // The very first letter at game start is the chain seed (the foundation),
    // not a preview — render it solid so it reads as "start here", not a ghost.
    // Pending tiles grow at the current top → grade them by the live top biome.
    pchars.forEach((ch, k) => live.push({ key: `s${C + k}`, pos: C + k, char: ch, color: gradeBlockColor(pendingColor, biomeId, palette), surface: topSurface, pending: !(C === 0 && k === 0), shared: false }));

    const total = live.length;
    const maxPos = total - 1;

    // Materialise the WHOLE live stack (committed + pending). No viewport cull —
    // the container translate moves everything, so culling by screen position
    // would fight the pan. Realistic towers are tens of tiles — cheap for Pixi.
    const liveKeys = new Set(live.map((l) => l.key));

    // Retire sprites no longer in the stack (a backspaced pending ghost).
    for (const [key, tile] of Array.from(registry.current)) {
      if (liveKeys.has(key)) continue;
      registry.current.delete(key);
      if (!reducedMotion && tile.pending) popOut(tile, () => { try { tile.destroy({ children: true }); } catch { /* */ } });
      else { try { tile.destroy({ children: true }); } catch { /* */ } }
    }

    // The just-committed word's bricks (pending ghost → solid this render). They
    // swivel into the stack TOGETHER as one rigid girder after the loop instead
    // of each popping in place — the satisfying "the crane sets the word down"
    // beat. Collected base→top (live is bottom→top), with their rest slot.
    const committing: { tile: TileSprite; restX: number; restY: number; color: number; pos: number }[] = [];

    // Add newcomers / update survivors — survivors keep their FIXED local y.
    for (const l of live) {
      const y = localY(l.pos);
      const existing = registry.current.get(l.key);
      if (!existing) {
        const tile = makeTile(l.char, size, l.color, l.pending, l.shared, l.pos, l.surface);
        tile.x = centerX;
        tile.zIndex = l.pos;
        c.addChild(tile);
        registry.current.set(l.key, tile);
        const isNewTop = l.pos > prevMaxPos.current;
        if (firstRender.current || reducedMotion || !isNewTop) {
          placeInstant(tile, y);
        } else {
          // A pending preview brick grows gently at the top while the player
          // builds the word (a soft low-distance drop) — the WEIGHTY placement is
          // saved for the crane drop (the group swivel below).
          const depth = l.pending ? Math.max(0, l.pos - C) : 0;
          const fx = letterPlacementFx(depth);
          dropIn(tile, y, 0, () => {
            impactRing(c, centerX, y + half, half, l.color, fx.ringScale * 0.6);
            engine.particles.burst(COMBO_FLASH, centerX, y + half, Math.round(fx.particles * 0.6)); // light puff
          });
        }
      } else {
        // Fixed local y → reposition ONLY on a real layout change (resize); never
        // for the climb — that is the container's job, keeping the stack rigid.
        if (Math.abs(existing.y - y) > 0.5) { placeInstant(existing, y); existing.x = centerX; }
        if (existing.color !== l.color || existing.pending !== l.pending) {
          const lockingIn = existing.pending && !l.pending;
          if (lockingIn && !reducedMotion) {
            // Paint solid at once (the ghost was only a preview), then swivel the
            // whole word-run in as a group below — no per-brick recolor fade.
            paintTile(existing, l.color, l.pending, l.shared);
            committing.push({ tile: existing, restX: centerX, restY: y, color: l.color, pos: l.pos });
          } else if (reducedMotion) {
            paintTile(existing, l.color, l.pending, l.shared);
          } else {
            // A non-lock colour change (the shared connector blending two words).
            recolor(existing, l.color, l.pending, l.shared);
          }
        }
      }
    }

    // Swivel the committed word in as ONE rigid piece, hinged at its base joint.
    if (committing.length > 0 && !reducedMotion) {
      const restYs = committing.map((b) => b.restY);
      const baseRestY = Math.max(...restYs); // bottom-most new brick (largest y)
      const topRestY = Math.min(...restYs);
      const pivotX = centerX;
      const pivotY = baseRestY + half; // the hinge: bottom edge of the run's base
      const topDy = pivotY - topRestY; // distance pivot → top brick (for arc cap)
      const startDeg = swivelStartDeg(leanRef.current, topDy);
      const durMs = swivelDurationMs(committing.length);
      const baseColor = committing[0].color;
      swivelWordIn(committing, pivotX, pivotY, startDeg, durMs, (i) => {
        const { tile } = committing[i];
        squashLand(tile); // each brick lands with weight as it settles flush
        if (i === 0) {
          // A heavy, layered thud where the girder bites in: a fat outer ring + a
          // tight inner ring read as a real shock-wave, a dust burst that scales
          // with the word's heft, and a camera kick. Punchier than the old single
          // ring so the placement lands with weight (founder: more satisfying FX).
          const heft = committing.length;
          impactRing(c, pivotX, pivotY, half, baseColor, 1.6);
          impactRing(c, pivotX, pivotY, half, baseColor, 0.85);
          engine.particles.burst(COMBO_FLASH, pivotX, pivotY, 14 + heft * 3);
          engine.shake.shake({ intensity: Math.min(13, 5 + heft * 1.6), duration: 0.24, decay: 'exponential' });
        }
      });

      // RESONANCE — the landing thud rings DOWN through the settled tower below
      // the new joint: each lower tile gives a tiny delayed scale-pop, a wave
      // travelling toward the base. Cosmetic (scale only), so it never touches
      // the score or fights the swivel above (which owns the new top tiles).
      lastCommitRef.current = performance.now(); // gate shaft-wind off until swivel ends
      commitDurRef.current = durMs;
      const basePos = Math.min(...committing.map((b) => b.pos));
      const settledBelow: number[] = [];
      for (const key of registry.current.keys()) {
        const p = Number(key.slice(1));
        if (Number.isFinite(p)) settledBelow.push(p);
      }
      for (const hit of resonanceSchedule(basePos, settledBelow)) {
        const tile = registry.current.get(`s${hit.pos}`);
        if (!tile) continue;
        window.setTimeout(() => { if (!tile.destroyed) bumpScale(tile, 0.07); }, hit.delayMs);
      }
    }

    // ── Camera = climb-follow (shift) + user pan, applied to the WHOLE container ──
    // On any action (letter add / commit) snap the pan to 0 and glide the camera
    // to the new build-line height. The glide moves the rigid stack as ONE piece
    // (so no inter-tile gap can appear) and starts before the 300ms tile drop, so
    // new-tile FX land on-screen. A pure resize keeps the user's pan.
    const snapKey = `${floors.length}|${pendingWord}`;
    const actioned = snapKey !== prevSnapKey.current;
    prevSnapKey.current = snapKey;
    if (!panState.current.dragging) {
      const bg = panState.current.bgEl;
      if (actioned) {
        panState.current.y = 0;
        if (reducedMotion || firstRender.current) c.y = shift;
        else snapContainerY(c, shift, 280, () => panState.current.dragging);
        // Glide the background back in sync with the camera snap.
        if (bg) { bg.style.transition = reducedMotion ? 'none' : 'transform 280ms cubic-bezier(0.22,1,0.36,1)'; bg.style.transform = ''; }
      } else {
        panState.current.y = clampPan(panState.current.y, panMin);
        c.y = shift + panState.current.y;
        if (bg) bg.style.transform = `translateY(${panState.current.y * BG_PAN_DEPTH}px)`;
      }
    }

    firstRender.current = false;
    prevMaxPos.current = maxPos;
    topPosRef.current = maxPos; // shaft-wind tick reads this
  }, [floors, pendingWord, engine, reducedMotion, bottomInsetPx, anchorLen, panState, biomeId, palette]);

  // A rejected WORD is an INPUT mistake, not tower damage — so the error feel
  // lives on the word-builder (HUD: red shake + message + haptic/sound), NOT on
  // the building. Shaking the whole tower for a typo read as "the building
  // shakes for no reason" (founder feel report 2026-06-07); only real structural
  // events (topple/hazard below, landing impacts above) move the stack now.

  // Jolt the whole view when a hazard/topple strikes — the collapse is FELT, not
  // just read off the banner. Heavier than the rejected-word stack wobble.
  const toppleFloorsRef = useRef(toppleFloors);
  toppleFloorsRef.current = toppleFloors;
  useEffect(() => {
    if (toppleKey === 0 || reducedMotion) return;
    // A floor gave way — a real CRASH: hard camera shake + a shower of rubble
    // raining from the build line + a danger flash + a violent stack wobble, all
    // scaled by how many floors were lost.
    const fx = toppleCrashFx(toppleFloorsRef.current);
    const { width: W, height: H } = engine;
    engine.shake.shake({ intensity: fx.shakePx, duration: fx.durationS, decay: 'exponential' });
    engine.particles.burst(CONFETTI_BURST, W / 2, H * 0.22, fx.debris); // tumbling rubble
    engine.particles.burst(COMBO_FLASH, W / 2, H * 0.24, Math.round(fx.debris / 2)); // dust puff
    engine.flash.flash({ color: 0xff3366, duration: fx.durationS, intensity: fx.flashAlpha }); // danger jolt
    const c = containerRef.current;
    if (c) shakeX(c); // the whole stack lurches, not just the camera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toppleKey]);

  // Visible instability — a static recent-weighted LEAN plus, once the tower is
  // unstable, a continuous SWING that oscillates around the base. The swing is
  // driven by a rAF clock so it never freezes between drops; `instability` 0
  // means a dead-steady tower (no swing, just the lean). The crane feeds the
  // SAME sway offset into its landing target, so what you see is what you place.
  // Pixi container.angle is in degrees; pivot at the base so it pivots from the
  // ground rather than spinning about its centre. Reduced-motion → upright.
  const leanRef = useRef(leanDeg);
  leanRef.current = leanDeg;
  const instabilityRef = useRef(instability);
  instabilityRef.current = instability;
  // Per-biome ambient wind intensity (cosmetic crown sway only — never scoring),
  // so the higher, more exposed zones visibly buffet the tower-top harder. The
  // Windbreak upgrade calms it (read imperatively to avoid store-churn re-renders).
  const windMultRef = useRef(1);
  windMultRef.current = BIOME_THEME[biomeId].windMult * useTowerUpgradeStore.getState().effects().windMult;
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    if (reducedMotion) { c.angle = 0; return; }
    let raf = 0;
    // Use the ABSOLUTE rAF timestamp (not a per-mount epoch) so this swing stays
    // phase-locked with the crane's target-guide swing — both read the same clock
    // + the same instability, so the visible tower lean and the landing target
    // always point the SAME way at the same instant (the headline of the feature).
    // After a commit the swivel owns the new tiles' x — hold off wind until it
    // finishes (its real duration + a small tail) so the two never fight.
    const WIND_COMMIT_TAIL_MS = 120;
    const tick = (now: number) => {
      const cc = containerRef.current;
      // angle = lean (drift) + heavy pendulum sway + a tiny high-freq jitter so
      // a stressed-but-not-yet-swaying tower still reads as nervous/on-edge. The
      // jitter is render-only (never in swayNormalizedOffset) so WYSIWYG holds.
      if (cc) {
        const inst0 = instabilityRef.current;
        cc.angle = leanRef.current + swayAngleAt(now, inst0) + swayJitterDeg(now, inst0);
      }
      // Upper-shaft wind: a tiny travelling x-sway on settled crown tiles so a
      // tall tower feels exposed and alive between drops. x-only (never y/scale),
      // recomputed each frame (no drift), skipped on the base band + pending tiles.
      const top = topPosRef.current;
      const cx = centerXRef.current;
      if (top > 0 && now - lastCommitRef.current > commitDurRef.current + WIND_COMMIT_TAIL_MS) {
        const inst = instabilityRef.current;
        const windMul = windMultRef.current;
        for (const [key, tile] of registry.current) {
          if (tile.destroyed || tile.pending) continue;
          const p = Number(key.slice(1));
          if (!Number.isFinite(p)) continue;
          tile.x = cx + shaftWindX(p, top, now, inst) * windMul;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Full-screen flash when crossing into a new biome.
  const prevBiome = useRef(biomeId);
  useEffect(() => {
    if (prevBiome.current !== biomeId) {
      if (!reducedMotion) {
        engine.flash.flash({ color: BIOME_THEME[biomeId].block, duration: 0.5, intensity: 0.45 });
        // Star shower to celebrate reaching a new zone (dopamine on arrival),
        // tinted to the zone you've JUST broken into so each arrival looks unique.
        engine.particles.burst(
          { ...GOLD_STARS, colors: BIOME_THEME[biomeId].particles.map(toHexStr) },
          engine.width / 2,
          engine.height * 0.24,
          34,
        );
      }
      prevBiome.current = biomeId;
    }
  }, [biomeId, engine, reducedMotion]);

  // Celebration FX on each accepted word — COLOUR-CODED BY DROP QUALITY so the
  // player instantly SEES whether they landed good/ok/bad (founder 2026-06-19:
  // "add more FX on the drop, make it noticeable when it was good, ok or bad").
  // A full-screen tint flash carries the verdict's colour (green/cyan/yellow/red)
  // while particles + shake scale the punch; the word-length tier (high-rise →
  // skyscraper) adds an EXTRA flourish on top for a long build.
  const dropQualityRef = useRef(dropQuality);
  dropQualityRef.current = dropQuality;
  // Keep the live biome id readable inside the [resultKey]-only FX effect so each
  // celebration burst spits THIS biome's palette (galaxy gold/purple, city
  // lime/white) instead of one generic confetti everywhere.
  const biomeIdRef = useRef(biomeId);
  biomeIdRef.current = biomeId;
  useEffect(() => {
    if (resultKey === 0 || !lastResult || reducedMotion) return;
    const { width: W, height: H } = engine;
    const x = W / 2;
    const y = H * 0.22;
    const q = dropQualityRef.current ?? 'good';
    const biomePal = BIOME_THEME[biomeIdRef.current].particles.map(toHexStr);
    if (q === 'perfect') {
      // Triumph — a bright lime wash, a biome-tinted star shower, and a kick.
      engine.flash.flash({ color: 0xbfff00, duration: 0.32, intensity: 0.34 });
      engine.particles.burst({ ...GOLD_STARS, colors: biomePal }, x, y, 40);
      engine.shake.shake({ intensity: 8, duration: 0.32, decay: 'exponential' });
    } else if (q === 'good') {
      // Solid — a cool cyan wash + a biome-tinted confetti pop.
      engine.flash.flash({ color: 0x22d3ee, duration: 0.26, intensity: 0.22 });
      engine.particles.burst({ ...CONFETTI_BURST, colors: biomePal }, x, y, 26);
    } else if (q === 'sloppy') {
      // Just ok — a brief amber blink + a small puff, no celebration.
      engine.flash.flash({ color: 0xffe135, duration: 0.22, intensity: 0.18 });
      engine.particles.burst(COMBO_FLASH, x, y, 12);
    } else {
      // Bad — a red warning wash + a sharp jolt so a fumbled drop clearly stings.
      engine.flash.flash({ color: 0xff3366, duration: 0.3, intensity: 0.3 });
      engine.particles.burst(COMBO_FLASH, x, y, 8);
      engine.shake.shake({ intensity: 5, duration: 0.26, decay: 'exponential' });
    }
    // Word-length tier flourish on top of the quality cue (longer build = more).
    if (lastResult.tier === 'skyscraper') {
      engine.particles.burst(GOLD_STARS, x, y, 30);
      engine.shake.shake({ intensity: 9, duration: 0.34, decay: 'exponential' });
    } else if (lastResult.tier === 'highRise' || lastResult.tier === 'tall') {
      engine.particles.burst(CONFETTI_BURST, x, y, 20);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey]);

  // CLUTCH SAVE — a clean drop pulled the tower back from the brink. The lean
  // snaps to upright (driven by leanDeg → 0); here we add the triumphant payoff:
  // a gold burst from the build line and a punchy "bass-thud" shake.
  useEffect(() => {
    if (clutchSaveKey === 0 || reducedMotion) return;
    const { width: W, height: H } = engine;
    engine.particles.burst(GOLD_STARS, W / 2, H * 0.32, 56);
    engine.particles.burst(CONFETTI_BURST, W / 2, H * 0.32, 28);
    engine.flash.flash({ color: 0xbfff00, duration: 0.35, intensity: 0.4 });
    engine.shake.shake({ intensity: 14, duration: 0.45, decay: 'exponential' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clutchSaveKey]);

  return null;
}

/** Full-bleed tower scene: biome sky gradient + parallax ascent backdrop + transparent Pixi canvas. */
export function WordTowerScene(props: SceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const pan = useRef<PanState>({ y: 0, panMin: 0, shift: 0, dragging: false, container: null, bgEl: null });

  // The altitude the camera is *looking at* = committed climb, lowered by the
  // user's pan toward the base. While panned, the backdrop (sky/clouds/props)
  // tracks the viewed floors instead of staying frozen at the top biome — so
  // scrolling down actually reveals the lower-altitude scene, not just a colour
  // tint. `null` = not panned → use the live committed height. Reset on every
  // committed word (height/biome change), since the pan snaps back to the top.
  const [panAltitude, setPanAltitude] = useState<number | null>(null);
  // True once the user has scrolled meaningfully below the build line → reveals
  // the back-to-top button. Reset whenever a committed word snaps us back up.
  const [pannedDown, setPannedDown] = useState(false);
  const rafRef = useRef<number | null>(null);
  // Inertial fling: a flicked drag keeps gliding after release (momentumRaf) so a
  // tall tower scrolls fast + feels alive, instead of a 1:1 finger-drag slog.
  const momentumRaf = useRef<number | null>(null);
  const stopMomentum = useCallback(() => {
    if (momentumRaf.current != null) { cancelAnimationFrame(momentumRaf.current); momentumRaf.current = null; }
  }, []);
  // Pulled out so the pan callbacks close over specific values (the React
  // Compiler can't preserve a `useCallback` that reads `props.*` directly).
  const { heightM, onViewAltChange } = props;
  useEffect(() => {
    stopMomentum(); // a commit yanks the camera to the build line — kill any fling
    setPanAltitude(null);
    setPannedDown(false);
    onViewAltChange?.(heightM); // snap sibling rails back to the live height
  }, [heightM, props.biomeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewAlt = panAltitude ?? heightM;
  const viewBiome = biomeForHeight(viewAlt);
  const blend = biomeBlendAt(viewAlt);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drag / wheel to pan the tower and review the lower floors. Handled by a
  // dedicated catcher div (in the render) with React pointer handlers + pointer
  // capture, so the gesture is owned outright instead of relying on pass-through
  // to the Pixi canvas (which silently swallowed it on mobile).
  const drag = useRef<{ y: number; pan: number; prevY: number; prevT: number; vel: number } | null>(null);
  const applyPan = (next: number) => {
    pan.current.y = clampPan(next, pan.current.panMin);
    const c = pan.current.container;
    if (c && !c.destroyed) c.y = pan.current.shift + pan.current.y;
    const bg = pan.current.bgEl;
    if (bg) { bg.style.transition = 'none'; bg.style.transform = `translateY(${pan.current.y * BG_PAN_DEPTH}px)`; }
    // Recompute the viewed altitude (throttled to one update per frame) so the
    // backdrop biome/clouds/props follow the scroll without thrashing renders.
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const alt = viewAltitudeFor(heightM, pan.current.y, pan.current.panMin);
        setPanAltitude(alt);
        setPannedDown(pan.current.y < -BACK_TO_TOP_REVEAL_PX);
        onViewAltChange?.(alt); // landmark + rival rails follow the scroll down
      });
    }
  };
  // Launch an inertial glide from a release velocity (px/ms). Each frame decays
  // the velocity (framerate-independent) and pans by it, stopping when it slows
  // below the cutoff or hits a bound (no overscroll). Reuses applyPan so the
  // backdrop + rails track the glide exactly like a manual drag.
  const startMomentum = (v0: number) => {
    stopMomentum();
    if (pan.current.panMin === 0) return; // tower fits → nothing to fling
    let vel = v0;
    let last = performance.now();
    const tick = (now: number) => {
      const step = stepMomentum(pan.current.y, vel, now - last, pan.current.panMin, 0);
      last = now;
      vel = step.v;
      applyPan(step.y);
      if (step.done) { momentumRaf.current = null; return; }
      momentumRaf.current = requestAnimationFrame(tick);
    };
    momentumRaf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (momentumRaf.current != null) cancelAnimationFrame(momentumRaf.current);
  }, []);

  // Glide the camera back to the build line (back-to-top button + minimap tap).
  const scrollToTop = useCallback(() => {
    stopMomentum(); // the snap owns the camera now — drop any in-flight fling
    const ps = pan.current;
    ps.y = 0;
    const c = ps.container;
    if (c && !c.destroyed) snapContainerY(c, ps.shift, 340, () => ps.dragging);
    const bg = ps.bgEl;
    if (bg) { bg.style.transition = 'transform 340ms cubic-bezier(0.22,1,0.36,1)'; bg.style.transform = ''; }
    setPanAltitude(null);
    setPannedDown(false);
    onViewAltChange?.(heightM); // rails snap back to the live top with the camera
  }, [heightM, onViewAltChange, stopMomentum]);

  const config = useMemo(
    () => (size ? { width: size.w, height: size.h, background: 0x000000, backgroundAlpha: 0 } : null),
    [size],
  );

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none overflow-hidden">
      {/* Static biome sky — TWO cross-fading gradient layers (current biome under
          the next at `blend.t`) so the colour shifts *continuously* with altitude.
          NOT inside the panned wrapper: a full-bleed fixed fill so scrolling down
          can never slide it away and expose the navy behind (the old blank band). */}
      <div className="absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 transition-[background] duration-700 ease-out"
          style={{ background: BIOME_THEME[blend.fromId].bg }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{ background: BIOME_THEME[blend.toId].bg, opacity: blend.t }}
        />
      </div>
      {/* Parallax elements grouped in one wrapper the pan translates (at
          BG_PAN_DEPTH) so stars/clouds/props parallax with the user's scroll. They
          are transparent over the static sky above — no edge can reveal navy. */}
      <div ref={(el) => { pan.current.bgEl = el; }} className="absolute inset-0 will-change-transform">
        {/* Parallax ascent backdrop (stars/clouds/skyline) — driven by the
            *viewed* altitude so panning down reveals that altitude's sky. */}
        <WordTowerBackdrop biomeId={viewBiome} heightM={viewAlt} reducedMotion={props.reducedMotion} />
        {/* Lazy altitude-reference props behind the tower (viewed altitude). */}
        <WordTowerParallaxProps heightM={viewAlt} reducedMotion={props.reducedMotion} />
        {/* Rare drifting sightings (cosmic whale / satellite / shooting star). */}
        <WordTowerSighting heightM={viewAlt} reducedMotion={props.reducedMotion} />
      </div>
      {/* Brand climb companion — pops in to cheer only when a word is built. */}
      <WordTowerMascot
        resultKey={props.resultKey}
        lastResult={props.lastResult}
        reducedMotion={props.reducedMotion}
      />
      {/* Pocket mini-tower: zone bands + a marker at the current height. Tap to
          jump back to the build line. */}
      <WordTowerMinimap
        heightM={props.heightM}
        viewM={viewAlt}
        personalBestM={props.personalBestM ?? 0}
        rivals={props.rivals}
        onScrollTop={scrollToTop}
        t={props.t ?? ((k) => k)}
      />
      {/* Back-to-top button — only while scrolled down past the build line. */}
      {pannedDown && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={(props.t ?? ((k) => k))('wordTower.hud.backToTop')}
          className={`pointer-events-auto absolute end-3 top-[12%] z-[9] flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-cyan px-2.5 py-1.5 font-neo-display text-xs font-bold text-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed ${props.reducedMotion ? '' : 'animate-neo-pop'}`}
        >
          <ChevronsUp className="h-4 w-4" />
          {(props.t ?? ((k) => k))('wordTower.hud.backToTop')}
        </button>
      )}
      {config && (
        <GameCanvas config={config} usePhysics={false} className="absolute inset-0">
          <TowerCanvasLayer {...props} panState={pan} />
        </GameCanvas>
      )}
      {/* Pan catcher — owns the drag/wheel gesture over the sky. The control deck
          + header (z-10, above) keep their taps; this only catches the open area. */}
      <div
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => {
          if (pan.current.panMin === 0) return;
          stopMomentum(); // grabbing the tower halts any glide in progress
          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ }
          pan.current.dragging = true;
          drag.current = { y: e.clientY, pan: pan.current.y, prevY: e.clientY, prevT: e.timeStamp, vel: 0 };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          applyPan(d.pan + (e.clientY - d.y));
          // Track release velocity (px/ms) from the last move for the fling.
          const dt = e.timeStamp - d.prevT;
          if (dt > 0) { d.vel = (e.clientY - d.prevY) / dt; d.prevY = e.clientY; d.prevT = e.timeStamp; }
        }}
        onPointerUp={() => {
          const d = drag.current;
          pan.current.dragging = false;
          drag.current = null;
          if (d && Math.abs(d.vel) > 0) startMomentum(clampFlickVelocity(d.vel)); // let go with speed → glide
        }}
        onPointerCancel={() => { pan.current.dragging = false; drag.current = null; }}
        onWheel={(e) => { if (pan.current.panMin !== 0) { stopMomentum(); applyPan(pan.current.y - e.deltaY * WHEEL_SCALE); } }}
      />
    </div>
  );
}
