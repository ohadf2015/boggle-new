'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
import { CONFETTI_BURST, COMBO_FLASH, GOLD_STARS } from '@/lib/gameEngine/presets/particles';
import type { WordTowerFloor, ApplyResult } from '@/lib/wordTower/wordTowerManager';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import { courseTileLayout } from '@/lib/wordTower/towerLayout';
import { BIOME_THEME, type BiomeTheme } from './biomeTheme';
import { WordTowerBackdrop } from './WordTowerBackdrop';

interface SceneProps {
  floors: WordTowerFloor[];
  biomeId: WordTowerBiomeId;
  /** Bumps each accepted word — fires the floor entrance + celebration FX. */
  resultKey: number;
  lastResult: ApplyResult | null;
  reducedMotion?: boolean;
  /** Text direction — RTL lays a course's letters right-to-left (Hebrew). */
  dir?: 'ltr' | 'rtl';
}

const FLOOR_GAP = 6;
const TILE_FONT = 'Fredoka, Rubik, sans-serif';

/** A single neo-brutalist letter tile (hard shadow + filled square + glyph). */
function makeLetterTile(char: string, x: number, y: number, size: number, theme: BiomeTheme): Container {
  const tileC = new Container();
  const r = Math.max(6, size * 0.18);

  const shadow = new Graphics();
  shadow.roundRect(3, 4, size, size, r).fill({ color: 0x000000, alpha: 0.5 });

  const face = new Graphics();
  face.roundRect(0, 0, size, size, r).fill({ color: theme.block });
  face.roundRect(0, 0, size, size, r).stroke({ color: 0x000000, width: 3, alignment: 1 });

  const label = new Text({
    text: char,
    style: new TextStyle({ fontFamily: TILE_FONT, fontSize: Math.min(size * 0.6, 34), fontWeight: '700', fill: theme.accent }),
  });
  label.anchor.set(0.5);
  label.x = size / 2;
  label.y = size / 2;

  tileC.addChild(shadow, face, label); // shadow first → renders behind the face
  tileC.x = x;
  tileC.y = y;
  return tileC;
}

/** A plain solid course brick — used for spoiler-free (word-less) versus floors. */
function makeBrick(x: number, w: number, h: number, theme: BiomeTheme): Container {
  const c = new Container();
  const shadow = new Graphics();
  shadow.roundRect(3, 4, w, h, 10).fill({ color: 0x000000, alpha: 0.55 });
  const g = new Graphics();
  g.roundRect(0, 0, w, h, 10).fill({ color: theme.block });
  g.roundRect(0, 0, w, h, 10).stroke({ color: 0x000000, width: 3, alignment: 1 });
  c.addChild(shadow, g);
  c.x = x;
  return c;
}

/** Brick-laying entrance: tiles drop + fade in, staggered left-to-right. */
function animateTileIn(tile: Container, idx: number): void {
  const finalY = tile.y;
  const drop = 26;
  const dur = 240;
  const t0 = performance.now() + idx * 40;
  tile.alpha = 0;
  const step = () => {
    if (tile.destroyed) return;
    const now = performance.now();
    if (now < t0) { requestAnimationFrame(step); return; }
    const k = Math.min(1, (now - t0) / dur);
    const ease = 1 - Math.pow(1 - k, 3);
    tile.alpha = ease;
    tile.y = finalY - drop * (1 - ease);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Whole-floor drop entrance — used for the (label-less) versus brick. */
function animateFloorIn(floor: Container, finalY: number): void {
  const dur = 260;
  const t0 = performance.now();
  floor.alpha = 0.001;
  const step = () => {
    if (floor.destroyed) return;
    const k = Math.min(1, (performance.now() - t0) / dur);
    const ease = 1 - Math.pow(1 - k, 3);
    floor.alpha = ease;
    floor.y = finalY - 28 * (1 - ease);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Imperatively draws the tower into the Pixi camera and fires celebration FX. */
function TowerCanvasLayer({ floors, biomeId, resultKey, lastResult, reducedMotion, dir = 'ltr' }: SceneProps) {
  const engine = useGameEngine();
  const containerRef = useRef<Container | null>(null);

  // One persistent container for the tower blocks.
  useEffect(() => {
    const c = new Container();
    c.sortableChildren = true;
    engine.camera.addChild(c);
    containerRef.current = c;
    return () => {
      try { c.destroy({ children: true }); } catch { /* */ }
      containerRef.current = null;
    };
  }, [engine.camera]);

  // Redraw the visible window of floors whenever the tower or canvas changes.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.removeChildren().forEach((ch) => ch.destroy({ children: true }));

    const { width: W, height: H } = engine;
    const theme = BIOME_THEME[biomeId];
    const blockW = Math.min(W * 0.7, 420);
    const blockH = Math.max(40, Math.min(64, H / 9));
    const x = (W - blockW) / 2;
    const topY = H * 0.22; // newest floor sits near the top quarter

    // Virtualize: only render floors that could be on-screen.
    const visibleCount = Math.ceil(H / (blockH + FLOOR_GAP)) + 2;
    const start = Math.max(0, floors.length - visibleCount);

    for (let i = floors.length - 1; i >= start; i--) {
      const fromTop = floors.length - 1 - i; // 0 = newest
      const y = topY + fromTop * (blockH + FLOOR_GAP);
      if (y > H + blockH) break;

      const word = floors[i]!.word;
      const chars = Array.from(word);
      const newest = fromTop === 0;
      const baseAlpha = newest ? 1 : Math.max(0.25, 1 - fromTop * 0.06);

      const floorC = new Container();
      floorC.y = y;
      floorC.alpha = baseAlpha;

      // Spoiler-free versus floor (no word data): render a plain solid brick so
      // height still rises without revealing the rival's words.
      if (chars.length === 0) {
        floorC.addChild(makeBrick(x, blockW, blockH, theme));
        c.addChild(floorC);
        if (newest && !reducedMotion) animateFloorIn(floorC, y);
        continue;
      }

      // Solo: the word's own letters become the tiles that build this course.
      const layout = courseTileLayout(word, blockW, { gap: 5, maxTile: blockH, minTile: 20, dir });
      const tileY = (blockH - layout.height) / 2;
      layout.tiles.forEach((tile, ti) => {
        const sprite = makeLetterTile(tile.char, x + tile.x, tileY, tile.size, theme);
        floorC.addChild(sprite);
        if (newest && !reducedMotion) animateTileIn(sprite, ti);
      });
      c.addChild(floorC);
    }
  }, [floors, biomeId, engine, reducedMotion, dir]);

  // Full-screen flash when crossing into a new biome.
  const prevBiome = useRef(biomeId);
  useEffect(() => {
    if (prevBiome.current !== biomeId) {
      if (!reducedMotion) {
        engine.flash.flash({ color: BIOME_THEME[biomeId].block, duration: 0.5, intensity: 0.45 });
      }
      prevBiome.current = biomeId;
    }
  }, [biomeId, engine, reducedMotion]);

  // Celebration FX on each accepted word.
  useEffect(() => {
    if (resultKey === 0 || !lastResult || reducedMotion) return;
    const { width: W, height: H } = engine;
    const x = W / 2;
    const y = H * 0.22;
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

/** Full-bleed tower scene: CSS biome gradient + parallax stars + transparent Pixi canvas. */
export function WordTowerScene(props: SceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const theme = BIOME_THEME[props.biomeId];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const config = useMemo(
    () => (size ? { width: size.w, height: size.h, background: 0x000000, backgroundAlpha: 0 } : null),
    [size],
  );

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      {/* Biome sky */}
      <div
        className="absolute inset-0 transition-[background] duration-1000 ease-out"
        style={{ background: theme.bg }}
        aria-hidden
      />
      {/* Star layer (fades in with altitude) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: theme.stars,
          backgroundImage:
            'radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 70% 60%, #fff, transparent), radial-gradient(2px 2px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 55% 45%, #fff, transparent)',
          backgroundSize: '320px 320px',
        }}
        aria-hidden
      />
      {/* Construction-site backdrop (crane, scaffold, skyline, clouds) */}
      <WordTowerBackdrop biomeId={props.biomeId} />
      {config && (
        <GameCanvas config={config} usePhysics={false} className="absolute inset-0">
          <TowerCanvasLayer {...props} />
        </GameCanvas>
      )}
    </div>
  );
}
