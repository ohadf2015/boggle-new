'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Container } from 'pixi.js';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
import { CONFETTI_BURST, COMBO_FLASH, GOLD_STARS } from '@/lib/gameEngine/presets/particles';
import type { WordTowerFloor, ApplyResult } from '@/lib/wordTower/wordTowerManager';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import { buildTowerColumn, wordColor } from '@/lib/wordTower/towerColumn';
import { letterPlacementFx } from '@/lib/wordTower/placementFx';
import { towerRowLayout, towerPanMin, clampPan } from '@/lib/wordTower/towerLayout';
import {
  makeTile, paintTile, placeInstant, dropIn, moveTo, popOut, recolor, bumpScale, shakeX, squashLand, impactRing,
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
}

/** Shared camera-pan state between the DOM gesture layer and the Pixi layer. */
interface PanState {
  /** Current pan offset applied to the tower container (always ≤ 0). */
  y: number;
  /** Most-negative offset allowed (reveals the base); 0 when the tower fits. */
  panMin: number;
  /** True while the user is actively dragging (suppresses the auto-snap). */
  dragging: boolean;
  /** The live tower container (set on mount). */
  container: Container | null;
}

/** One live row in the unified (committed ++ pending) stack. */
interface LiveCell {
  key: string;
  pos: number; // position from the bottom — stable registry key
  char: string | null;
  color: number;
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
function TowerCanvasLayer({ floors, biomeId, pendingWord, resultKey, errorKey, lastResult, reducedMotion, bottomInsetPx = 220, panState }: SceneProps & { panState: MutableRefObject<PanState> }) {
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
    c.y = ps.y;
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
    const { size, half, rowH, centerY } = towerRowLayout({ pinCount: C, H, bottomInsetPx });
    // How far down the user can pan to review the tower — also widens the keep
    // window below so panned-to floors are already materialised (the diff does
    // NOT re-run mid-pan; the container just translates).
    const panMin = towerPanMin(centerY(0), H, bottomInsetPx, half);
    panState.current.panMin = panMin;
    const pendingColor = wordColor(floors.length);
    // Skip the anchor (pendingWord[0]) when it's already the committed top.
    const pchars = C === 0 ? Array.from(pendingWord) : Array.from(pendingWord).slice(1);

    const live: LiveCell[] = committed.map((cell, i) => ({
      key: `s${i}`,
      pos: i,
      char: cell.kind === 'letter' ? cell.char : null,
      color: cell.color,
      pending: false,
      shared: cell.kind === 'letter' ? cell.shared : false,
    }));
    // The very first letter at game start is the chain seed (the foundation),
    // not a preview — render it solid so it reads as "start here", not a ghost.
    pchars.forEach((ch, k) => live.push({ key: `s${C + k}`, pos: C + k, char: ch, color: pendingColor, pending: !(C === 0 && k === 0), shared: false }));

    const total = live.length;
    const maxPos = total - 1;

    // Virtualize against the full PANNABLE range (not just the current viewport),
    // so every floor the user can scroll down to is already on the stage — panning
    // only translates the container, it never re-runs this diff.
    const visible = live.filter((l) => { const y = centerY(l.pos); return y > -rowH * 1.5 && y < H + rowH - panMin; });
    const visKeys = new Set(visible.map((v) => v.key));

    // Retire sprites that left the window (scrolled off → destroy; backspaced ghost → pop out).
    for (const [key, tile] of Array.from(registry.current)) {
      if (visKeys.has(key)) continue;
      registry.current.delete(key);
      if (!reducedMotion && tile.pending) popOut(tile, () => { try { tile.destroy({ children: true }); } catch { /* */ } });
      else { try { tile.destroy({ children: true }); } catch { /* */ } }
    }

    // Add newcomers / update survivors.
    for (const l of visible) {
      const y = centerY(l.pos);
      const existing = registry.current.get(l.key);
      if (!existing) {
        const tile = makeTile(l.char, size, l.color, l.pending, l.shared);
        tile.x = centerX;
        tile.zIndex = l.pos;
        c.addChild(tile);
        registry.current.set(l.key, tile);
        const isNewTop = l.pos > prevMaxPos.current;
        if (firstRender.current || reducedMotion || !isNewTop) {
          placeInstant(tile, y);
        } else {
          // Escalating placement juice: each deeper letter in the word lands with
          // a heavier squash, a bigger shockwave ring, and more impact particles.
          const depth = l.pending ? Math.max(0, l.pos - C) : 0;
          const fx = letterPlacementFx(depth);
          dropIn(tile, y, 0, () => {
            squashLand(tile);
            impactRing(c, centerX, y + half, half, l.color, fx.ringScale);
            engine.particles.burst(COMBO_FLASH, centerX, y + half, fx.particles); // puff at the impact point
          });
        }
      } else {
        if (reducedMotion) placeInstant(existing, y);
        else moveTo(existing, y);
        if (existing.color !== l.color || existing.pending !== l.pending) {
          const lockingIn = existing.pending && !l.pending;
          if (reducedMotion) paintTile(existing, l.color, l.pending, l.shared);
          else { recolor(existing, l.color, l.pending, l.shared); if (lockingIn) bumpScale(existing); }
        }
      }
    }

    // ── User-scroll camera ──
    // Refresh the pan extent (how far down the now-taller tower can be reviewed),
    // then snap back to the build line whenever the player ACTS (adds a letter /
    // commits a word) so the new tile + its drop FX always land on-screen — even
    // if they had panned down to review the lower floors. A pure resize keeps the
    // current pan (re-clamped), it doesn't yank the view.
    const snapKey = `${floors.length}|${pendingWord}`;
    const actioned = snapKey !== prevSnapKey.current;
    prevSnapKey.current = snapKey;
    if (!panState.current.dragging) {
      if (actioned && panState.current.y !== 0) {
        panState.current.y = 0;
        if (reducedMotion) c.y = 0;
        else snapContainerY(c, 0, 240, () => panState.current.dragging); // starts before the 440ms drop → FX lands on-screen
      } else {
        panState.current.y = clampPan(panState.current.y, panState.current.panMin);
        c.y = panState.current.y;
      }
    }

    firstRender.current = false;
    prevMaxPos.current = maxPos;
  }, [floors, pendingWord, engine, reducedMotion, bottomInsetPx, panState]);

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
  const theme = BIOME_THEME[props.biomeId];
  const pan = useRef<PanState>({ y: 0, panMin: 0, dragging: false, container: null });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drag / wheel to pan the tower down and review the lower floors. Swipe up (or
  // wheel down) reveals the base; the pan auto-snaps back on the next action.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let startY = 0;
    let startPan = 0;
    let active = false;
    const setPan = (next: number) => {
      pan.current.y = clampPan(next, pan.current.panMin);
      const c = pan.current.container;
      if (c && !c.destroyed) c.y = pan.current.y;
    };
    const onDown = (e: PointerEvent) => {
      if (pan.current.panMin === 0) return; // short tower — nothing below to reveal
      active = true;
      pan.current.dragging = true;
      startY = e.clientY;
      startPan = pan.current.y;
    };
    const onMove = (e: PointerEvent) => { if (active) setPan(startPan + (e.clientY - startY)); };
    const onUp = () => { active = false; pan.current.dragging = false; };
    const onWheel = (e: WheelEvent) => { setPan(pan.current.y - e.deltaY); };
    // Capture phase: fire before Pixi's canvas-level interaction so the pan
    // always starts even though the Pixi <canvas> sits inside this wrapper.
    el.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const config = useMemo(
    () => (size ? { width: size.w, height: size.h, background: 0x000000, backgroundAlpha: 0 } : null),
    [size],
  );

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none overflow-hidden">
      {/* Biome sky (cross-fades city → galaxy as you climb) */}
      <div
        className="absolute inset-0 transition-[background] duration-1000 ease-out"
        style={{ background: theme.bg }}
        aria-hidden
      />
      {/* Parallax ascent backdrop (stars/clouds/skyline scroll by altitude) */}
      <WordTowerBackdrop biomeId={props.biomeId} heightM={props.heightM} reducedMotion={props.reducedMotion} />
      {/* Lazy altitude-reference props (balloon→birds→plane→satellite→UFO) behind the tower */}
      <WordTowerParallaxProps heightM={props.heightM} reducedMotion={props.reducedMotion} />
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
    </div>
  );
}
