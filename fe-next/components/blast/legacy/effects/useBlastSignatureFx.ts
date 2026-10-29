'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Graphics, type Application, type Container } from 'pixi.js';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { FxPool } from './blastFxPool';
import { createFxGovernor, type FxGovernor, type FxQuality } from './blastFxGovernor';
import { createSignatureFx, createPathGlow, type SignatureFx } from './blastSignatureFx';
import { planClearFx, nextShimmer, type CellsChannel, type FxTile, type SpecialFxTile as SpecialTile } from './blastFxEvents';
import { chainFxStep, type ShakeLevel } from './blastFxIntensity';
import { isBlastFxDisabled } from './blastFxSwitch';
import {
  setFxAudio,
  playBigWordRiser,
  playBombThump,
  playChainLadder,
  playCoinChime,
  playDiamondPayoff,
} from './blastFxAudio';

interface ShakeLike {
  shake: (opts: { intensity: number; duration: number; decay?: 'linear' | 'exponential' }) => void;
}
interface DilationLike {
  slowDown: (scale: number, durationSec: number) => void;
  apply: (deltaSec: number) => number;
}

export type { SpecialFxTile as SpecialTile } from './blastFxEvents';

interface Options {
  app: Application;
  camera: Container;
  shake: ShakeLike;
  timeDilation: DilationLike;
  width: number;
  height: number;
  cellSize: number;
  chainLevel: number;
  maxQuality: FxQuality;
  selection?: CellsChannel;
  specialTiles: readonly SpecialTile[];
}

const CAP: Record<FxQuality, number> = { 0: 90, 1: 170, 2: 260 };
const SHIMMER_BUDGET: Record<FxQuality, number> = { 0: 0, 1: 2, 2: 3 };
const SHAKE: Record<Exclude<ShakeLevel, 'none'>, { intensity: number; duration: number }> = {
  light: { intensity: 2.5, duration: 0.12 },
  medium: { intensity: 5, duration: 0.2 },
  heavy: { intensity: 9, duration: 0.3 },
};

/** Wallet counter centre in board-canvas coordinates (coins fly off-board toward it). */
function coinTarget(width: number): { x: number; y: number } {
  const board = document.querySelector<HTMLElement>('[data-blast-board="true"]');
  const counter = document.querySelector<HTMLElement>('[data-coin-counter="true"]');
  if (!board || !counter) return { x: width * 0.85, y: -60 };
  const b = board.getBoundingClientRect();
  const c = counter.getBoundingClientRect();
  return { x: c.left + c.width / 2 - b.left, y: Math.min(-40, c.top + c.height / 2 - b.top) };
}

export function useBlastSignatureFx({
  app, camera, shake, timeDilation, width, height, cellSize, chainLevel, maxQuality, selection, specialTiles,
}: Options) {
  const govRef = useRef<FxGovernor>(createFxGovernor({ maxQuality }));
  const sigRef = useRef<SignatureFx | null>(null);
  const poolRef = useRef<FxPool | null>(null);
  const pathRef = useRef<ReturnType<typeof createPathGlow> | null>(null);
  const edgeRef = useRef<Graphics | null>(null);
  const specialsRef = useRef(specialTiles);
  specialsRef.current = specialTiles;
  const chainRef = useRef({ level: 0, peak: 0 });

  const { sfxMuted, sfxVolume } = useSoundEffects();
  useEffect(() => {
    setFxAudio({ muted: sfxMuted, volume: sfxVolume });
  }, [sfxMuted, sfxVolume]);

  useEffect(() => {
    govRef.current.setMaxQuality(maxQuality);
  }, [maxQuality]);

  useEffect(() => {
    if (camera.destroyed || isBlastFxDisabled()) return;
    const pool = new FxPool(camera);
    poolRef.current = pool;
    sigRef.current = createSignatureFx({ pool, gov: govRef.current, width, height, cellSize });
    pathRef.current = createPathGlow(pool.layer, cellSize);
    const edge = new Graphics().rect(3, 3, width - 6, height - 6).stroke({ width: 6, color: 0xffffff });
    edge.blendMode = 'add';
    edge.alpha = 0;
    pool.layer.addChild(edge);
    edgeRef.current = edge;

    let time = 0;
    let shimmerIn = 0.8;
    let shimmerLive = 0;
    const tick = () => {
      const gov = govRef.current;
      const dtMs = app.ticker.deltaMS;
      gov.sample(dtMs);
      pool.cap = CAP[gov.quality];
      const dt = timeDilation.apply(Math.min(dtMs, 50) / 1000);
      time += dt;
      pool.update(dt);
      pathRef.current?.pulse(time);
      const target = chainRef.current.level >= 1 ? 0.4 : 0;
      if (edge.alpha > target) edge.alpha = Math.max(target, edge.alpha - dt * 1.6);

      shimmerIn -= dt;
      if (shimmerIn <= 0) {
        shimmerIn = 0.55 + Math.random() * 0.5;
        shimmerLive = Math.max(0, shimmerLive - 1);
        const busy = document.hidden || !!document.querySelector('[data-board][data-locked]');
        const pick = !busy && gov.allows('ambient')
          ? nextShimmer(specialsRef.current, Math.random(), shimmerLive, SHIMMER_BUDGET[gov.quality])
          : null;
        if (pick) {
          shimmerLive++;
          sigRef.current?.shimmer(pick.col * cellSize + cellSize / 2, pick.row * cellSize + cellSize / 2, pick.type);
        }
      }
    };
    app.ticker.add(tick);
    return () => {
      app.ticker?.remove(tick);
      pathRef.current?.destroy();
      pathRef.current = null;
      sigRef.current = null;
      poolRef.current = null;
      edgeRef.current = null;
      pool.destroy();
    };
  }, [app, camera, timeDilation, width, height, cellSize]);

  useEffect(() => selection?.subscribe((cells) => pathRef.current?.set(cells)), [selection]);

  useEffect(() => {
    const prev = chainRef.current;
    const sig = sigRef.current;
    if (!sig) {
      prev.level = chainLevel;
      return;
    }
    if (chainLevel > prev.level && chainLevel >= 1) {
      sig.chainStep(chainLevel);
      const edge = edgeRef.current;
      if (edge && !edge.destroyed) {
        edge.tint = chainFxStep(chainLevel).edgeColor;
        edge.alpha = 1;
      }
      prev.peak = Math.max(prev.peak, chainLevel);
    } else if (chainLevel === 0 && prev.level > 0) {
      if (prev.peak >= 2) {
        sig.chainRelease(prev.peak);
        playChainLadder(prev.peak);
      }
      prev.peak = 0;
    }
    prev.level = chainLevel;
  }, [chainLevel]);

  /** Signature FX for one clear event; returns the plan so callers can scale legacy bursts. */
  const playClear = useCallback((tiles: readonly FxTile[], isWordPop: boolean, score: number) => {
    const plan = planClearFx(tiles, { cellSize, isWordPop, score });
    const sig = sigRef.current;
    if (!sig) return plan;
    let coinAt: { x: number; y: number } | null = null;
    let diamond = false;
    for (const cue of plan.cues) {
      if (cue.kind === 'bomb') sig.bomb(cue.x, cue.y, plan.bombPower);
      else if (cue.kind === 'coin') {
        coinAt ??= coinTarget(width);
        sig.coin(cue.x, cue.y, cue.stackIndex, coinAt);
        // Coin 0 already rings from the tile sound; the stack climbs from there.
        if (cue.stackIndex > 0) playCoinChime(cue.stackIndex);
      } else {
        sig.diamond(cue.x, cue.y);
        diamond = true;
      }
    }
    if (plan.bombPower > 0) {
      shake.shake({ intensity: 7 + 7 * plan.bombPower, duration: 0.28 + 0.1 * plan.bombPower, decay: 'exponential' });
      playBombThump(plan.bombPower);
    }
    if (diamond) {
      // Pixi-only slow-mo: input/sequencer timing is untouched.
      timeDilation.slowDown(0.15, 0.1);
      playDiamondPayoff();
    }
    const w = plan.word;
    if (w) {
      sig.word(plan.centroid.x, plan.centroid.y, w);
      if (w.shake !== 'none' && plan.bombPower === 0) shake.shake({ ...SHAKE[w.shake], decay: 'exponential' });
      if (w.bigWord) {
        sig.bigWord(plan.centroid.x, plan.centroid.y);
        playBigWordRiser(w.pitch);
      }
    } else if (plan.bombPower === 0) {
      shake.shake({ ...SHAKE.light, decay: 'exponential' });
    }
    return plan;
  }, [cellSize, width, shake, timeDilation]);

  const resetForWave = useCallback(() => {
    govRef.current.reset();
    poolRef.current?.clear();
    chainRef.current = { level: 0, peak: 0 };
  }, []);

  return { govRef, playClear, resetForWave };
}
