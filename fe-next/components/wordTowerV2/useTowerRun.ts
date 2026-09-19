'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import { TOWER_SURPRISE_META, type TowerSurpriseSound } from '@/lib/wordTower/towerSurprise';
import { publishHeightM } from '@/lib/wordTowerV2/altitude';
import { CRANE_CLEARANCE_PX, SWING, releaseKinematics } from '@/lib/wordTowerV2/crane';
import {
  PX_PER_M,
  type TowerWorld,
  createTowerWorld,
  getTowerHeightM,
  moveAttachedBlock,
  releaseBlock,
  snapshotWorld,
  spawnBlock,
  stepWorld,
} from '@/lib/wordTowerV2/engine';
import { type LandingQuality, type SupportTop, classifyLanding } from '@/lib/wordTowerV2/landing';
import { type RunState, type SurprisePayout, applyLanding, consumeWidthMult, createRun } from '@/lib/wordTowerV2/run';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '@/lib/wordTowerV2/scoring';
import type { TowerFx } from './TowerCanvas';

/**
 * Word Tower v2 run loop, outside the render tree's concerns: spawns and
 * releases blocks, reads verdicts off the SETTLED simulation, pays surprises,
 * and ends the run when physics says the tower fell.
 */

const POLL_MS = 100;
const DEMO_WORDS = ['tower', 'slab', 'anchor', 'crane', 'brick', 'ledge', 'beam', 'stack'];
/** Stop waiting for a block to settle after this long and judge it anyway. */
const SETTLE_TIMEOUT_MS = 2600;
const BEST_KEY = 'wordTowerV2.bestM';

export type Phase = 'composing' | 'swinging' | 'over';

interface PendingLanding {
  id: string;
  wordLen: number;
  support: SupportTop | null;
  releasedAt: number;
}

export interface LandingEvent {
  key: number;
  quality: LandingQuality;
  points: number;
  combo: number;
}

export interface SurpriseEvent extends SurprisePayout {
  key: number;
}

const SURPRISE_SOUND: Record<TowerSurpriseSound, keyof typeof SOUND_EFFECTS> = {
  powerUp: 'powerUp',
  gift: 'giftReceived',
  timeBonus: 'timeBonus',
  rare: 'rareWord',
  chest: 'chestOpen',
};

function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(m: number): void {
  try {
    window.localStorage.setItem(BEST_KEY, m.toFixed(2));
  } catch {
    // Private mode: the best line just resets next visit.
  }
}

/** The settled block the next drop should land on: highest top, excluding `skipId`. */
function supportTop(world: TowerWorld, skipId: string | null): SupportTop | null {
  let best: SupportTop | null = null;
  for (const b of snapshotWorld(world).blocks) {
    if (b.id === skipId || !world.landed.has(b.id)) continue;
    const topY = b.y - b.heightPx / 2;
    if (!best || topY < best.topY) best = { x: b.x, topY, widthPx: b.widthPx };
  }
  return best;
}

export function useTowerRun() {
  const { playSound, playComboSound, playWordLengthSound, setGameActive } = useSoundEffects();

  const worldRef = useRef<TowerWorld>(createTowerWorld({ seed: 1 }));
  const labelsRef = useRef(new Map<string, string>());
  const fxRef = useRef<TowerFx[]>([]);
  const runRef = useRef<RunState>(createRun(1));
  const runNoRef = useRef(0);
  const dropCountRef = useRef(0);
  const hangingRef = useRef<{ id: string; startedAt: number; wordLen: number } | null>(null);
  const pendingRef = useRef<PendingLanding | null>(null);
  const bestRef = useRef(0);
  const beatBestRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('composing');
  const [heightM, setHeightM] = useState(0);
  const [peakM, setPeakM] = useState(0);
  const [run, setRun] = useState<RunState>(runRef.current);
  const [bestM, setBestM] = useState(0);
  const [landing, setLanding] = useState<LandingEvent | null>(null);
  const [surprise, setSurprise] = useState<SurpriseEvent | null>(null);
  const [newBest, setNewBest] = useState(false);

  useEffect(() => {
    bestRef.current = readBest();
    setBestM(bestRef.current);
    // Fresh surprise seed per visit; render must stay pure, so not in useRef().
    runRef.current = createRun(Date.now());
    setRun(runRef.current);
  }, []);

  // Without this every playSound() silently no-ops: the context gates on it.
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  const resolveLanding = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    const block = snapshotWorld(worldRef.current).blocks.find((b) => b.id === pending.id);
    if (!block) return;

    const quality = classifyLanding(
      { x: block.x, bottomY: block.y + block.heightPx / 2, angleRad: block.angleRad },
      pending.support,
    );
    const out = applyLanding(runRef.current, { quality, wordLen: pending.wordLen });
    runRef.current = out.run;
    setRun(out.run);
    fxRef.current.push({ kind: 'land', id: pending.id, quality });
    if (out.tenants > 0) fxRef.current.push({ kind: 'tenants', id: pending.id, count: out.tenants });
    setLanding({ key: performance.now(), quality, points: out.points, combo: out.run.combo });

    if (quality === 'perfect') {
      if (out.run.combo > 1) playComboSound(out.run.combo);
      else playSound('perfectWord');
    } else if (quality === 'good') playSound('pathConnect');
    else if (quality === 'sloppy') playSound('tileAppear');
    else playSound('comboBreak');

    if (out.surprise) {
      fxRef.current.push({ kind: 'gold', id: pending.id });
      setSurprise({ ...out.surprise, key: performance.now() });
      playSound(SURPRISE_SOUND[TOWER_SURPRISE_META[out.surprise.event].sound]);
    }
  }, [playComboSound, playSound]);

  const endRun = useCallback(() => {
    resolveLanding();
    hangingRef.current = null;
    const peak = worldRef.current.peakHeightPx / PX_PER_M;
    setPeakM(peak);
    if (peak > bestRef.current) {
      bestRef.current = peak;
      setBestM(peak);
      writeBest(peak);
    }
    fxRef.current.push({ kind: 'collapse' });
    playSound('defeatSting');
    setPhase('over');
  }, [playSound, resolveLanding]);

  // One poll drives the HUD height, verdicts and collapse.
  useEffect(() => {
    const id = window.setInterval(() => {
      const world = worldRef.current;
      const h = getTowerHeightM(world);
      setHeightM((shown) => publishHeightM(shown, h));

      if (phase === 'over') return;
      if (world.collapsed) {
        endRun();
        return;
      }

      if (!beatBestRef.current && bestRef.current > 0.5 && h > bestRef.current) {
        beatBestRef.current = true;
        setNewBest(true);
        playSound('crownSparkle');
      }

      const pending = pendingRef.current;
      if (pending) {
        const snap = snapshotWorld(world).blocks.find((b) => b.id === pending.id);
        const timedOut = performance.now() - pending.releasedAt > SETTLE_TIMEOUT_MS;
        if (!snap || (snap.resting && world.landed.has(pending.id)) || timedOut) resolveLanding();
      }

    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [phase, endRun, resolveLanding, playSound]);

  /** Drives the crane: the hanging block follows the swing until released. */
  const onBeforeStep = useCallback((nowMs: number) => {
    const hanging = hangingRef.current;
    if (!hanging) return;
    const world = worldRef.current;
    const { x } = releaseKinematics(nowMs - hanging.startedAt, SWING, 0);
    moveAttachedBlock(world, hanging.id, x, -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX));
  }, []);

  /** Sideways speed (px/ms) the hanging block would leave the hook with right now. */
  const getHangVx = useCallback(() => {
    const hanging = hangingRef.current;
    return hanging ? releaseKinematics(performance.now() - hanging.startedAt, SWING, 0).vx : 0;
  }, []);

  /** Width the next block would get for `word`, including any banked updraft. */
  const previewWidth = useCallback(
    (word: string) => Math.round(blockWidthForWord(word) * runRef.current.nextWidthMult),
    [],
  );

  const hoist = useCallback(
    (word: string) => {
      if (phase !== 'composing') return;
      const world = worldRef.current;
      const { run: spent, mult } = consumeWidthMult(runRef.current);
      runRef.current = spent;
      setRun(spent);

      const id = `r${runNoRef.current}-b${dropCountRef.current}`;
      dropCountRef.current += 1;
      labelsRef.current.set(id, word);
      spawnBlock(world, {
        id,
        x: 0,
        y: -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX),
        widthPx: Math.round(blockWidthForWord(word) * mult),
        heightPx: BLOCK_HEIGHT_PX,
        vx: 0,
        attached: true,
      });
      hangingRef.current = { id, startedAt: performance.now(), wordLen: word.length };
      playWordLengthSound(word.length);
      setPhase('swinging');
    },
    [phase, playWordLengthSound],
  );

  const drop = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging) return;
    // A new drop before the last one settled: judge the old one now.
    resolveLanding();
    const world = worldRef.current;
    const support = supportTop(world, hanging.id);
    const { vx, spin } = releaseKinematics(performance.now() - hanging.startedAt, SWING, 0);
    releaseBlock(world, hanging.id, vx, spin);
    pendingRef.current = { id: hanging.id, wordLen: hanging.wordLen, support, releasedAt: performance.now() };
    hangingRef.current = null;
    playSound('swipeTransition', { volume: 0.4 });
    setPhase('composing');
  }, [playSound, resolveLanding]);

  const restart = useCallback(() => {
    runNoRef.current += 1;
    dropCountRef.current = 0;
    worldRef.current = createTowerWorld({ seed: runNoRef.current });
    labelsRef.current = new Map();
    hangingRef.current = null;
    pendingRef.current = null;
    beatBestRef.current = false;
    runRef.current = createRun(Date.now());
    setRun(runRef.current);
    setHeightM(0);
    setNewBest(false);
    setLanding(null);
    setSurprise(null);
    setPhase('composing');
  }, []);

  const setScrambles = useCallback((next: RunState) => {
    runRef.current = next;
    setRun(next);
  }, []);

  /** `?demo=1`: pre-build a tower so the screen can be reviewed without playing. */
  /** Review hook (`?demo=1`, optionally `&words=a,b,c` to see another script). */
  const seedDemo = useCallback((words: string[] = DEMO_WORDS) => {
    if (dropCountRef.current > 0) return; // StrictMode double-invoke guard
    const world = worldRef.current;
    words.forEach((word, index) => {
      const id = `r0-b${index}`;
      labelsRef.current.set(id, word);
      spawnBlock(world, {
        id,
        x: (index % 2 === 0 ? 1 : -1) * index * 2.6,
        y: -(getTowerHeightM(world) * PX_PER_M + 170),
        widthPx: blockWidthForWord(word),
        heightPx: BLOCK_HEIGHT_PX,
        vx: 0,
      });
      for (let t = 0; t < 900; t += 16.667) stepWorld(world, 16.667);
    });
    dropCountRef.current = words.length;
  }, []);

  return {
    worldRef, labelsRef, fxRef, hangingRef,
    phase, heightM, peakM, bestM, run, landing, surprise, newBest,
    onBeforeStep, getHangVx, previewWidth, hoist, drop, restart, setScrambles, seedDemo,
  };
}
