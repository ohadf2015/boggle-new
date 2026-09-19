'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import { type RunStats, emptyStats, loadUnlocked, newlyUnlocked, saveUnlocked } from '@/lib/wordTowerV2/achievements';
import { publishHeightM } from '@/lib/wordTowerV2/altitude';
import { biomeAt, floorsAt } from '@/lib/wordTowerV2/biomes';
import { BANNER_PRIORITY, type Banner, type BannerKind, type CalloutCopy, landingCallout, pushBanner, wordCallout } from '@/lib/wordTowerV2/celebrations';
import { CRANE_CLEARANCE_PX, type CraneSwing, SWING, releaseKinematics } from '@/lib/wordTowerV2/crane';
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
  weldBelow,
} from '@/lib/wordTowerV2/engine';
import { type LandingQuality, type SupportTop, classifyLanding } from '@/lib/wordTowerV2/landing';
import { type RewardId, steadySwing } from '@/lib/wordTowerV2/rewards';
import { type RunState, type SurprisePayout, applyLanding, consumeDrop, createRun } from '@/lib/wordTowerV2/run';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '@/lib/wordTowerV2/scoring';
import type { TowerFx } from './TowerCanvas';

/**
 * Word Tower v2 run loop, outside the render tree's concerns: spawns and
 * releases floors, reads verdicts off the SETTLED simulation, opens crates,
 * awards badges, and ends the run when physics says the tower fell.
 */

const POLL_MS = 100;
const DEMO_WORDS = ['tower', 'slab', 'anchor', 'crane', 'brick', 'ledge', 'beam', 'stack'];
/** Stop waiting for a floor to settle after this long and judge it anyway. */
const SETTLE_TIMEOUT_MS = 2600;
const BEST_KEY = 'wordTowerV2.bestM';
/** Floors the rebar crate leaves live at the top. */
const REBAR_KEEP_TOP = 2;

export type Phase = 'composing' | 'swinging' | 'over';

interface Hanging {
  id: string;
  startedAt: number;
  wordLen: number;
  swing: CraneSwing;
  plumb: boolean;
}

interface PendingLanding {
  id: string;
  wordLen: number;
  support: SupportTop | null;
  releasedAt: number;
}

export interface CalloutEvent extends CalloutCopy {
  key: number;
  points: number;
}

export type SurpriseEvent = SurprisePayout & { key: number };

const REWARD_SOUND: Record<RewardId, keyof typeof SOUND_EFFECTS> = {
  steady: 'powerUp',
  plumb: 'powerUp',
  wide: 'giftReceived',
  rebar: 'vaultUnlock',
  scramble: 'timeBonus',
  jackpot: 'coinCascade',
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

/** The settled floor the next drop should land on: highest top, excluding `skipId`. */
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
  const hangingRef = useRef<Hanging | null>(null);
  const pendingRef = useRef<PendingLanding | null>(null);
  const bestRef = useRef(0);
  const beatBestRef = useRef(false);
  const statsRef = useRef<RunStats>(emptyStats());
  const unlockedRef = useRef<Set<string>>(new Set());
  const seenBiomesRef = useRef(new Set<string>(['downtown']));
  const bannerKeyRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('composing');
  const [heightM, setHeightM] = useState(0);
  const [peakM, setPeakM] = useState(0);
  const [run, setRun] = useState<RunState>(runRef.current);
  const [bestM, setBestM] = useState(0);
  const [callout, setCallout] = useState<CalloutEvent | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newBest, setNewBest] = useState(false);
  const [runBadges, setRunBadges] = useState<string[]>([]);

  useEffect(() => {
    bestRef.current = readBest();
    setBestM(bestRef.current);
    unlockedRef.current = loadUnlocked();
    // Fresh crate seed per visit; render must stay pure, so not in useRef().
    runRef.current = createRun(Date.now());
    setRun(runRef.current);
  }, []);

  // Without this every playSound() silently no-ops: the context gates on it.
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  const banner = useCallback((kind: BannerKind, id: string) => {
    bannerKeyRef.current += 1;
    const key = bannerKeyRef.current;
    setBanners((q) => pushBanner(q, { key, kind, id, priority: BANNER_PRIORITY[kind] }));
  }, []);

  /** The banner on screen is done: show the next one. */
  const shiftBanner = useCallback(() => setBanners((q) => q.slice(1)), []);

  const checkBadges = useCallback(() => {
    const fresh = newlyUnlocked(statsRef.current, unlockedRef.current);
    if (fresh.length === 0) return;
    for (const id of fresh) {
      unlockedRef.current.add(id);
      banner('achievement', id);
    }
    saveUnlocked(unlockedRef.current);
    setRunBadges((b) => [...b, ...fresh]);
    playSound('achievement');
  }, [banner, playSound]);

  const openCrate = useCallback(
    (reward: SurprisePayout, blockId: string) => {
      fxRef.current.push({ kind: 'gold', id: blockId });
      banner('reward', reward.id);
      playSound(REWARD_SOUND[reward.id]);
      if (reward.rebar) {
        const welded = weldBelow(worldRef.current, REBAR_KEEP_TOP);
        statsRef.current.welds += welded.length > 0 ? 1 : 0;
        fxRef.current.push({ kind: 'rebar', ids: welded });
      }
    },
    [banner, playSound],
  );

  const resolveLanding = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    const block = snapshotWorld(worldRef.current).blocks.find((b) => b.id === pending.id);
    if (!block) return;

    const quality: LandingQuality = classifyLanding(
      { x: block.x, bottomY: block.y + block.heightPx / 2, angleRad: block.angleRad },
      pending.support,
    );
    const out = applyLanding(runRef.current, { quality, wordLen: pending.wordLen });
    runRef.current = out.run;
    setRun(out.run);
    fxRef.current.push({ kind: 'land', id: pending.id, quality });
    if (out.tenants > 0) fxRef.current.push({ kind: 'tenants', id: pending.id, count: out.tenants });
    setCallout({ ...landingCallout(quality, out.run.combo, Math.random()), key: performance.now(), points: out.points });

    if (quality === 'perfect') {
      if (out.run.combo > 1) playComboSound(out.run.combo);
      else playSound('perfectWord');
    } else if (quality === 'good') playSound('pathConnect');
    else if (quality === 'sloppy') playSound('tileAppear');
    else playSound('comboBreak');

    if (out.reward) openCrate(out.reward, pending.id);

    const s = statsRef.current;
    s.floors = out.run.floors;
    s.bestCombo = out.run.bestCombo;
    s.perfects += quality === 'perfect' ? 1 : 0;
    s.tenants = out.run.tenants;
    s.crates = out.run.crates;
    checkBadges();
  }, [playComboSound, playSound, openCrate, checkBadges]);

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

  // One poll drives the HUD height, verdicts, new skies and collapse.
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

      const floors = floorsAt(h);
      if (floors > statsRef.current.peakFloors) {
        statsRef.current.peakFloors = floors;
        const sky = biomeAt(floors).id;
        if (!seenBiomesRef.current.has(sky)) {
          seenBiomesRef.current.add(sky);
          banner('zone', sky);
          playSound('levelUp', { volume: 0.5 });
          checkBadges();
        }
      }

      if (!beatBestRef.current && bestRef.current > 0.5 && h > bestRef.current) {
        beatBestRef.current = true;
        setNewBest(true);
        banner('best', 'best');
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
  }, [phase, endRun, resolveLanding, playSound, banner, checkBadges]);

  /** Drives the crane: the hanging floor follows the swing until released. */
  const onBeforeStep = useCallback((nowMs: number) => {
    const hanging = hangingRef.current;
    if (!hanging) return;
    const world = worldRef.current;
    const { x } = releaseKinematics(nowMs - hanging.startedAt, hanging.swing, 0);
    moveAttachedBlock(world, hanging.id, x, -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX));
  }, []);

  /** Sideways speed (px/ms) the hanging floor would leave the hook with right now. */
  const getHangVx = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging || hanging.plumb) return 0;
    return releaseKinematics(performance.now() - hanging.startedAt, hanging.swing, 0).vx;
  }, []);

  /** Width the next floor would get for `word`, including a banked wide-load crate. */
  const previewWidth = useCallback(
    (word: string) => Math.round(blockWidthForWord(word) * runRef.current.nextWidthMult),
    [],
  );

  const hoist = useCallback(
    (word: string) => {
      if (phase !== 'composing') return;
      const world = worldRef.current;
      const spent = consumeDrop(runRef.current);
      runRef.current = spent.run;
      setRun(spent.run);

      const id = `r${runNoRef.current}-b${dropCountRef.current}`;
      dropCountRef.current += 1;
      labelsRef.current.set(id, word);
      spawnBlock(world, {
        id,
        x: 0,
        y: -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX),
        widthPx: Math.round(blockWidthForWord(word) * spent.widthMult),
        heightPx: BLOCK_HEIGHT_PX,
        vx: 0,
        attached: true,
      });
      hangingRef.current = {
        id,
        startedAt: performance.now(),
        wordLen: word.length,
        swing: spent.steady ? steadySwing(SWING) : SWING,
        plumb: spent.plumb,
      };
      statsRef.current.longestWord = Math.max(statsRef.current.longestWord, word.length);
      const big = wordCallout(word.length);
      if (big) {
        setCallout({ textKey: big, tone: 'purple', key: performance.now(), points: 0 });
        playSound('longWordBonus');
      } else playWordLengthSound(word.length);
      setPhase('swinging');
    },
    [phase, playWordLengthSound, playSound],
  );

  const drop = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging) return;
    // A new drop before the last one settled: judge the old one now.
    resolveLanding();
    const world = worldRef.current;
    const support = supportTop(world, hanging.id);
    const k = releaseKinematics(performance.now() - hanging.startedAt, hanging.swing, 0);
    releaseBlock(world, hanging.id, hanging.plumb ? 0 : k.vx, hanging.plumb ? 0 : k.spin);
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
    statsRef.current = emptyStats();
    seenBiomesRef.current = new Set(['downtown']);
    runRef.current = createRun(Date.now());
    setRun(runRef.current);
    setHeightM(0);
    setNewBest(false);
    setCallout(null);
    setBanners([]);
    setRunBadges([]);
    setPhase('composing');
  }, []);

  const setScrambles = useCallback((next: RunState) => {
    runRef.current = next;
    setRun(next);
  }, []);

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
        y: -(getTowerHeightM(world) * PX_PER_M + BLOCK_HEIGHT_PX + 20),
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
    phase, heightM, peakM, bestM, run, callout, banners, shiftBanner, newBest, runBadges, unlockedRef, statsRef,
    onBeforeStep, getHangVx, previewWidth, hoist, drop, restart, setScrambles, seedDemo,
  };
}
