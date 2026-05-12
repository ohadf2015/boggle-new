// ─── Blast Game Canvas ────────────────────────────────────────────────
// PixiJS-rendered game board with Matter.js physics, particle effects,
// trail rendering, physics debris, screen flash, and special tile glow.

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  useGameEngine,
  TileRenderer,
  ScoreFlyManager,
  TweenManager,
  Easing,
  TrailRenderer,
  PhysicsDebris,
  type TileData,
  type TileRenderConfig,
} from '@/lib/gameEngine';
import {
  COMBO_FLASH, WORD_TRAIL, CASCADE_SPARKLE,
  BOARD_CLEAR, AMBIENT_BOKEH,
  CONFETTI_BURST, GOLD_STARS,
} from '@/lib/gameEngine/presets/particles';
import { useBlastClearEffects } from './useBlastClearEffects';
import type { BlastTileState, BlastTileType } from '@/components/blast/legacy/types';

interface BlastGameCanvasProps {
  tileStates: BlastTileState[][];
  letterGrid: string[][];
  selectedPath: Array<{ row: number; col: number }>;
  gridSize: number;
  onTileSelect: (row: number, col: number) => void;
  onSubmitWord: () => void;
  clearedTiles?: Array<{ row: number; col: number; type: BlastTileType }>;
  comboLevel?: number;
  cascadeLevel?: number;
  scoreFly?: { score: number; row: number; col: number; tier: number } | null;
  waveCleared?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}


export function BlastGameCanvas({
  tileStates, letterGrid, selectedPath, gridSize,
  onTileSelect, onSubmitWord, clearedTiles, comboLevel,
  cascadeLevel, scoreFly, waveCleared, canvasWidth, canvasHeight,
}: BlastGameCanvasProps) {
  const { camera, particles, shake, physics, app, flash, timeDilation } = useGameEngine();

  const tileRendererRef = useRef<TileRenderer | null>(null);
  const scoreFlyRef = useRef<ScoreFlyManager | null>(null);
  const tweenRef = useRef<TweenManager | null>(null);
  const trailRef = useRef<TrailRenderer | null>(null);
  const debrisRef = useRef<PhysicsDebris | null>(null);
  const tileStatesRef = useRef(tileStates);
  tileStatesRef.current = tileStates;
  const prevComboRef = useRef(0);
  const prevCascadeRef = useRef(0);
  const isDraggingRef = useRef(false);

  const HUD_TOP = 80;
  const HUD_BOTTOM = 55;
  const cw = canvasWidth ?? app.canvas.width;
  const ch = canvasHeight ?? app.canvas.height;
  const availableSize = Math.min(cw, ch - HUD_TOP - HUD_BOTTOM);
  const gap = Math.max(2, Math.round(availableSize * 0.01));
  const tileSize = Math.floor((availableSize - gap * (gridSize - 1)) / gridSize);

  const tileConfig: TileRenderConfig = {
    tileSize, gap, cols: gridSize, rows: gridSize,
    cornerRadius: Math.round(tileSize * 0.12),
  };

  // ─── Initialize all systems on mount ───────────────────────────

  useEffect(() => {
    const renderer = new TileRenderer(camera, tileConfig);
    tileRendererRef.current = renderer;

    const offsetX = (cw - renderer.gridWidth) / 2;
    const offsetY = HUD_TOP + (ch - HUD_TOP - HUD_BOTTOM - renderer.gridHeight) / 2;
    renderer.container.x = offsetX;
    renderer.container.y = offsetY;

    // Trail renderer — replaces static Graphics path line
    const trail = new TrailRenderer(camera, {
      color: 0x00ffff,
      glowColor: 0x0088ff,
      maxAge: 0.4,
      maxWidth: 6,
      maxPoints: 48,
    });
    trailRef.current = trail;

    const scoreFlyMgr = new ScoreFlyManager(camera);
    scoreFlyRef.current = scoreFlyMgr;
    const tween = new TweenManager();
    tweenRef.current = tween;

    // Physics debris system
    const floorY = offsetY + renderer.gridHeight + 40;
    const debris = new PhysicsDebris(camera, physics, {
      floorY,
      maxDebris: 50,
      maxAge: 2.5,
      pieceSize: Math.max(4, tileSize * 0.08),
    });
    debrisRef.current = debris;

    // Create floor wall for debris to land on
    const wallId = physics.createWall(cw / 2, floorY + 10, cw, 20);

    // Ambient background particles
    particles.create(AMBIENT_BOKEH).emit(cw / 2, ch / 2);

    const tickHandler = (ticker: { deltaMS: number }) => {
      const dt = ticker.deltaMS / 1000;
      renderer.update(dt);
      scoreFlyMgr.update(dt);
      tween.update(dt);
      trail.update(dt);
      debris.update(dt);
    };
    app.ticker.add(tickHandler);

    return () => {
      try { app.ticker?.remove(tickHandler); } catch { /* */ }
      renderer.destroy();
      scoreFlyMgr.destroy();
      tween.destroy();
      trail.destroy();
      debris.destroy();
      try { physics.removeBody(wallId); } catch { /* */ }
      try { particles.clear(); } catch { /* */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, cw, ch]);

  // ─── Update trail with selection path ──────────────────────────

  useEffect(() => {
    const trail = trailRef.current;
    const renderer = tileRendererRef.current;
    if (!trail || !renderer) return;

    trail.clear();

    if (selectedPath.length === 0) return;

    const offsetX = renderer.container.x;
    const offsetY = renderer.container.y;

    for (const cell of selectedPath) {
      const pos = renderer.tileToPixel(cell.row, cell.col);
      trail.addPoint(pos.x + offsetX, pos.y + offsetY);
    }
  }, [selectedPath]);

  // ─── Sync tiles from game state ─────────────────────────────────

  useEffect(() => {
    const renderer = tileRendererRef.current;
    if (!renderer) return;

    const selectedSet = new Set(selectedPath.map(p => `${p.row}-${p.col}`));
    const tiles: TileData[] = [];
    for (let r = 0; r < tileStates.length; r++) {
      for (let c = 0; c < tileStates[r].length; c++) {
        const ts = tileStates[r][c];
        if (ts.isCleared) continue;
        tiles.push({
          id: ts.uid, row: r, col: c,
          letter: letterGrid[r]?.[c] ?? '', variant: ts.type,
          selected: selectedSet.has(`${r}-${c}`),
        });
      }
    }
    renderer.setTiles(tiles);
  }, [tileStates, letterGrid, selectedPath]);

  // ─── Handle cleared tiles → per-type visual effects ─────────────

  useBlastClearEffects({
    clearedTiles, tileStatesRef, tileRendererRef, debrisRef,
    particles, shake, physics, flash, timeDilation, tileSize, gridSize,
  });

  // ─── Combo effects ──────────────────────────────────────────────

  useEffect(() => {
    const level = comboLevel ?? 0;
    if (level <= prevComboRef.current || level < 2) { prevComboRef.current = level; return; }
    prevComboRef.current = level;

    particles.burst(COMBO_FLASH, cw / 2, ch / 2, 15 + level * 5);
    shake.shake({ intensity: 4 + level * 2, duration: 0.2 + level * 0.05, decay: 'exponential' });

    // Screen flash on combo x3+
    if (level >= 3) {
      flash.combo();
    }

    // Confetti on combo x5+
    if (level >= 5) {
      particles.burst(CONFETTI_BURST, cw / 2, ch / 2, 40);
      flash.flash({ color: 0xffcc00, duration: 0.25, intensity: 0.3 });
      // Epic slow-mo for huge combos
      timeDilation.slowDown(0.2, 0.5);
    }

    // Tween a scale punch on the camera for high combos
    const tween = tweenRef.current;
    if (tween && level >= 3) {
      tween.add({
        from: 1.03,
        to: 1.0,
        duration: 0.3,
        easing: Easing.easeOutElastic,
        onUpdate: (v) => { camera.scale.set(v); },
      });
    }
  }, [comboLevel, particles, shake, flash, camera, timeDilation, cw, ch]);

  // ─── Cascade chain sparkle ──────────────────────────────────────

  useEffect(() => {
    const level = cascadeLevel ?? 0;
    if (level <= prevCascadeRef.current || level < 1) { prevCascadeRef.current = level; return; }
    prevCascadeRef.current = level;
    const renderer = tileRendererRef.current;
    if (!renderer) return;
    const cx = renderer.container.x + renderer.gridWidth / 2;
    const cy = renderer.container.y + renderer.gridHeight;
    particles.burst(CASCADE_SPARKLE, cx, cy, 10 + level * 5);
  }, [cascadeLevel, particles]);

  // ─── Score fly ──────────────────────────────────────────────────

  useEffect(() => {
    if (!scoreFly) return;
    const renderer = tileRendererRef.current;
    const mgr = scoreFlyRef.current;
    if (!renderer || !mgr) return;
    const pos = renderer.tileToPixel(scoreFly.row, scoreFly.col);
    mgr.fly({
      score: scoreFly.score,
      from: { x: pos.x + renderer.container.x, y: pos.y + renderer.container.y },
      to: { x: cw / 2, y: HUD_TOP / 2 },
      tier: scoreFly.tier,
    });
  }, [scoreFly, cw]);

  // ─── Wave cleared celebration ───────────────────────────────────

  useEffect(() => {
    if (!waveCleared) return;

    // Brief freeze frame before celebration
    timeDilation.freeze(0.15);

    // Big confetti burst with shaped particles
    particles.burst(CONFETTI_BURST, cw / 2, ch / 2, 60);
    particles.burst(BOARD_CLEAR, cw / 2, ch / 2, 40);
    particles.burst(GOLD_STARS, cw / 2, ch * 0.3, 20);
    shake.heavy();
    flash.white();

    // Double burst with delay for extra drama
    setTimeout(() => {
      try {
        particles.burst(CONFETTI_BURST, cw / 2, ch / 2, 30);
        flash.flash({ color: 0xffcc00, duration: 0.3, intensity: 0.25 });
      } catch { /* */ }
    }, 200);

    // Camera zoom punch via tween
    const tween = tweenRef.current;
    if (tween) {
      tween.add({
        from: 1.05,
        to: 1.0,
        duration: 0.5,
        easing: Easing.easeOutBounce,
        onUpdate: (v) => { camera.scale.set(v); },
      });
    }
  }, [waveCleared, particles, shake, flash, camera, timeDilation, cw, ch]);

  // ─── Input: drag-to-select word path ─────────────────────────────

  const getCellFromEvent = useCallback(
    (e: React.PointerEvent) => {
      const renderer = tileRendererRef.current;
      if (!renderer) return null;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left - renderer.container.x;
      const y = e.clientY - rect.top - renderer.container.y;
      return renderer.pixelToTile(x, y);
    }, [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const cell = getCellFromEvent(e);
      if (!cell) return;
      isDraggingRef.current = true;
      onTileSelect(cell.row, cell.col);
      const renderer = tileRendererRef.current;
      if (renderer) {
        const pos = renderer.tileToPixel(cell.row, cell.col);
        const wx = pos.x + renderer.container.x;
        const wy = pos.y + renderer.container.y;
        particles.burst(WORD_TRAIL, wx, wy, 6);

        // Tile selection bounce via tween
        const tween = tweenRef.current;
        if (tween) {
          tween.add({
            from: 1.15,
            to: 1.0,
            duration: 0.2,
            easing: Easing.easeOutBack,
            onUpdate: (v) => {
              const tilePos = renderer.getTilePosition(`${cell.row}-${cell.col}`);
              if (tilePos) {
                // Scale is handled by TileRenderer's selected pulse
                // but we add a quick "pop" on first select
                void v; // tween drives visual via TileRenderer
              }
            },
          });
        }
      }
    }, [getCellFromEvent, particles, onTileSelect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const cell = getCellFromEvent(e);
      if (!cell) return;
      onTileSelect(cell.row, cell.col);
      const renderer = tileRendererRef.current;
      if (renderer) {
        const pos = renderer.tileToPixel(cell.row, cell.col);
        particles.burst(WORD_TRAIL, pos.x + renderer.container.x, pos.y + renderer.container.y, 3);
      }
    }, [getCellFromEvent, onTileSelect, particles],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    onSubmitWord();
  }, [onSubmitWord]);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', touchAction: 'none' }}
    />
  );
}
