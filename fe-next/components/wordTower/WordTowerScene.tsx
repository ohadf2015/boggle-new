'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
import { CONFETTI_BURST, COMBO_FLASH, GOLD_STARS } from '@/lib/gameEngine/presets/particles';
import type { WordTowerFloor, ApplyResult } from '@/lib/wordTower/wordTowerManager';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import { BIOME_THEME } from './biomeTheme';

interface SceneProps {
  floors: WordTowerFloor[];
  biomeId: WordTowerBiomeId;
  /** Bumps each accepted word — fires the floor entrance + celebration FX. */
  resultKey: number;
  lastResult: ApplyResult | null;
  reducedMotion?: boolean;
}

const FLOOR_GAP = 6;

/** Imperatively draws the tower into the Pixi camera and fires celebration FX. */
function TowerCanvasLayer({ floors, biomeId, resultKey, lastResult, reducedMotion }: SceneProps) {
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

      const g = new Graphics();
      g.roundRect(0, 0, blockW, blockH, 10).fill({ color: theme.block });
      g.roundRect(0, 0, blockW, blockH, 10).stroke({ color: 0x000000, width: 3, alignment: 1 });
      // hard pixel shadow
      const shadow = new Graphics();
      shadow.roundRect(3, 4, blockW, blockH, 10).fill({ color: 0x000000, alpha: 0.55 });
      shadow.zIndex = -1;

      const label = new Text({
        text: floors[i]!.word,
        style: new TextStyle({
          fontFamily: 'Fredoka, Rubik, sans-serif',
          fontSize: Math.min(28, blockH * 0.5),
          fontWeight: '700',
          fill: theme.accent,
          letterSpacing: 2,
        }),
      });
      label.anchor.set(0.5);
      label.x = blockW / 2;
      label.y = blockH / 2;

      const block = new Container();
      block.addChild(shadow, g, label);
      block.x = x;
      block.y = y;
      block.alpha = fromTop === 0 ? 0.001 : Math.max(0.25, 1 - fromTop * 0.06);
      c.addChild(block);

      // Entrance animation for the newest floor.
      if (fromTop === 0) {
        if (reducedMotion) {
          block.alpha = 1;
        } else {
          block.y = y - 28;
          const t0 = performance.now();
          const dur = 260;
          const animate = () => {
            if (block.destroyed) return;
            const k = Math.min(1, (performance.now() - t0) / dur);
            const ease = 1 - Math.pow(1 - k, 3);
            block.alpha = ease;
            block.y = y - 28 * (1 - ease);
            if (k < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      }
    }
  }, [floors, biomeId, engine, reducedMotion]);

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
      {config && (
        <GameCanvas config={config} usePhysics={false} className="absolute inset-0">
          <TowerCanvasLayer {...props} />
        </GameCanvas>
      )}
    </div>
  );
}
