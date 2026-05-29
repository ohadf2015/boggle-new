'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ChevronsUp } from 'lucide-react';
import { Container } from 'pixi.js';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
import { CONFETTI_BURST, COMBO_FLASH, GOLD_STARS } from '@/lib/gameEngine/presets/particles';
import { biomeForHeight, type WordTowerFloor, type ApplyResult } from '@/lib/wordTower/wordTowerManager';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import { buildTowerColumn, cellAltitudes, wordColor } from '@/lib/wordTower/towerColumn';
import { gradeBlockColor, blockSurface, type BlockSurface } from '@/lib/wordTower/blockGrade';
import { viewAltitudeFor } from '@/lib/wordTower/viewAltitude';
import { biomeBlendAt } from '@/lib/wordTower/biomeBlend';
import { letterPlacementFx } from '@/lib/wordTower/placementFx';
import { towerRowLayout, towerPanMin, clampPan } from '@/lib/wordTower/towerLayout';
import { stepMomentum, clampFlickVelocity, WHEEL_SCALE } from '@/lib/wordTower/scrollMomentum';
import {
  makeTile, paintTile, placeInstant, dropIn, popOut, recolor, bumpScale, shakeX, squashLand, impactRing,
  type TileSprite,
} from './towerSprites';
import { BIOME_THEME } from './biomeTheme';
import { WordTowerBackdrop } from './WordTowerBackdrop';
import { WordTowerParallaxProps } from './WordTowerParallaxProps';
import { WordTowerMascot } from './WordTowerMascot';
import { WordTowerMinimap } from './WordTowerMinimap';

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
  reducedMotion?: boolean;
  /** Height (px) of the bottom control deck — the tower grounds just above it. */
  bottomInsetPx?: number;
  /** Anchor length (1 or 2) — how many leading pending chars are the connector. */
  anchorLen?: number;
  /** Personal best (m) — drawn as a tick on the minimap. */
  personalBestM?: number;
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
  /** Bumps on every hazard/topple strike — fires the jolt screen shake so a
   *  collapse is FELT, not just announced by the banner. */
  toppleKey?: number;
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
function TowerCanvasLayer({ floors, biomeId, pendingWord, resultKey, errorKey, lastResult, reducedMotion, bottomInsetPx = 220, anchorLen = 1, leanDeg = 0, clutchSaveKey = 0, toppleKey = 0, panState }: SceneProps & { panState: MutableRefObject<PanState> }) {
  const engine = useGameEngine();
  const containerRef = useRef<Container | null>(null);
  const registry = useRef<Map<string, TileSprite>>(new Map());
  const firstRender = useRef(true);
  const prevMaxPos = useRef(-1);
  const prevSnapKey = useRef('');

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
    const pchars = C === 0 ? Array.from(pendingWord) : Array.from(pendingWord).slice(anchorLen);

    const live: LiveCell[] = committed.map((cell, i) => {
      const zone = biomeForHeight(alts[i] ?? 0);
      return {
        key: `s${i}`,
        pos: i,
        char: cell.kind === 'letter' ? cell.char : null,
        color: gradeBlockColor(cell.color, zone),
        surface: blockSurface(zone),
        pending: false,
        shared: cell.kind === 'letter' ? cell.shared : false,
      };
    });
    // The very first letter at game start is the chain seed (the foundation),
    // not a preview — render it solid so it reads as "start here", not a ghost.
    // Pending tiles grow at the current top → grade them by the live top biome.
    pchars.forEach((ch, k) => live.push({ key: `s${C + k}`, pos: C + k, char: ch, color: gradeBlockColor(pendingColor, biomeId), surface: topSurface, pending: !(C === 0 && k === 0), shared: false }));

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
          // Escalating placement juice: each deeper letter lands with a heavier
          // squash, a bigger shockwave ring, and more impact particles.
          const depth = l.pending ? Math.max(0, l.pos - C) : 0;
          const fx = letterPlacementFx(depth);
          dropIn(tile, y, 0, () => {
            squashLand(tile);
            impactRing(c, centerX, y + half, half, l.color, fx.ringScale);
            engine.particles.burst(COMBO_FLASH, centerX, y + half, fx.particles); // puff at the impact point
          });
        }
      } else {
        // Fixed local y → reposition ONLY on a real layout change (resize); never
        // for the climb — that is the container's job, keeping the stack rigid.
        if (Math.abs(existing.y - y) > 0.5) placeInstant(existing, y);
        if (existing.color !== l.color || existing.pending !== l.pending) {
          const lockingIn = existing.pending && !l.pending;
          if (reducedMotion) paintTile(existing, l.color, l.pending, l.shared);
          else { recolor(existing, l.color, l.pending, l.shared); if (lockingIn) bumpScale(existing); }
        }
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
  }, [floors, pendingWord, engine, reducedMotion, bottomInsetPx, anchorLen, panState, biomeId]);

  // Shake the stack when a word is rejected.
  useEffect(() => {
    if (errorKey === 0 || reducedMotion) return;
    const c = containerRef.current;
    if (c) shakeX(c);
  }, [errorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Jolt the whole view when a hazard/topple strikes — the collapse is FELT, not
  // just read off the banner. Heavier than the rejected-word stack wobble.
  useEffect(() => {
    if (toppleKey === 0 || reducedMotion) return;
    engine.shake.shake({ intensity: 16, duration: 0.5, decay: 'exponential' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toppleKey]);

  // Visible instability lean — recent-weighted from crane drops, clamped small.
  // Pixi container.angle is in degrees; pivot at the base so the tower leans
  // FROM the ground rather than rotating around its centre.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    if (reducedMotion) { c.angle = 0; return; }
    c.angle = leanDeg;
  }, [leanDeg, reducedMotion]);

  // Full-screen flash when crossing into a new biome.
  const prevBiome = useRef(biomeId);
  useEffect(() => {
    if (prevBiome.current !== biomeId) {
      if (!reducedMotion) {
        engine.flash.flash({ color: BIOME_THEME[biomeId].block, duration: 0.5, intensity: 0.45 });
        // Star shower to celebrate reaching a new zone (dopamine on arrival).
        engine.particles.burst(GOLD_STARS, engine.width / 2, engine.height * 0.24, 34);
      }
      prevBiome.current = biomeId;
    }
  }, [biomeId, engine, reducedMotion]);

  // Celebration FX on each accepted word.
  useEffect(() => {
    if (resultKey === 0 || !lastResult || reducedMotion) return;
    const { width: W, height: H } = engine;
    const x = W / 2;
    const y = H * 0.2;
    if (lastResult.tier === 'skyscraper') {
      engine.particles.burst(GOLD_STARS, x, y, 48);
      engine.shake.shake({ intensity: 10, duration: 0.4, decay: 'exponential' });
    } else if (lastResult.tier === 'highRise' || lastResult.tier === 'tall') {
      engine.particles.burst(CONFETTI_BURST, x, y, 40);
    } else {
      engine.particles.burst(COMBO_FLASH, x, y, 14);
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
