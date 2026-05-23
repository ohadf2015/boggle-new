'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
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
import {
  makeTile, paintTile, placeInstant, dropIn, popOut, recolor, bumpScale, shakeX, squashLand, impactRing,
  type TileSprite,
} from './towerSprites';
import { BIOME_THEME } from './biomeTheme';
import { WordTowerBackdrop } from './WordTowerBackdrop';
import { WordTowerParallaxProps } from './WordTowerParallaxProps';
import { WordTowerMascot } from './WordTowerMascot';

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
function TowerCanvasLayer({ floors, biomeId, pendingWord, resultKey, errorKey, lastResult, reducedMotion, bottomInsetPx = 220, anchorLen = 1, panState }: SceneProps & { panState: MutableRefObject<PanState> }) {
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
  }, [floors, pendingWord, engine, reducedMotion, bottomInsetPx, anchorLen, panState]);

  // Shake the stack when a word is rejected.
  useEffect(() => {
    if (errorKey === 0 || reducedMotion) return;
    const c = containerRef.current;
    if (c) shakeX(c);
  }, [errorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Full-screen flash when crossing into a new biome.
  const prevBiome = useRef(biomeId);
  useEffect(() => {
    if (prevBiome.current !== biomeId) {
      if (!reducedMotion) engine.flash.flash({ color: BIOME_THEME[biomeId].block, duration: 0.5, intensity: 0.45 });
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
  const rafRef = useRef<number | null>(null);
  useEffect(() => { setPanAltitude(null); }, [props.heightM, props.biomeId]);

  const viewAlt = panAltitude ?? props.heightM;
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
  const drag = useRef<{ y: number; pan: number } | null>(null);
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
        setPanAltitude(viewAltitudeFor(props.heightM, pan.current.y, pan.current.panMin));
      });
    }
  };
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  const config = useMemo(
    () => (size ? { width: size.w, height: size.h, background: 0x000000, backgroundAlpha: 0 } : null),
    [size],
  );

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none overflow-hidden">
      {/* Background layers grouped in one wrapper that the pan translates (at
          BG_PAN_DEPTH) so the sky/props parallax with the user's scroll too. */}
      <div ref={(el) => { pan.current.bgEl = el; }} className="absolute inset-0 will-change-transform">
        {/* Biome sky — TWO cross-fading gradient layers (current biome under the
            next one at `blend.t`) so the colour shifts *continuously* with
            altitude instead of snapping at the six biome thresholds. */}
        <div
          className="absolute inset-0 transition-[background] duration-700 ease-out"
          style={{ background: BIOME_THEME[blend.fromId].bg }}
          aria-hidden
        />
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{ background: BIOME_THEME[blend.toId].bg, opacity: blend.t }}
          aria-hidden
        />
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
          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ }
          pan.current.dragging = true;
          drag.current = { y: e.clientY, pan: pan.current.y };
        }}
        onPointerMove={(e) => { if (drag.current) applyPan(drag.current.pan + (e.clientY - drag.current.y)); }}
        onPointerUp={() => { pan.current.dragging = false; drag.current = null; }}
        onPointerCancel={() => { pan.current.dragging = false; drag.current = null; }}
        onWheel={(e) => { if (pan.current.panMin !== 0) applyPan(pan.current.y - e.deltaY); }}
      />
    </div>
  );
}
