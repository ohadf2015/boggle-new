'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Body } from 'matter-js';
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
  despawnBlock,
  getTowerHeightM,
  moveAttachedBlock,
  releaseBlock,
  snapshotWorld,
  spawnBlock,
  stepWorld,
  weldBelow,
} from '@/lib/wordTowerV2/engine';
import { type LandingQuality, type SupportTop, classifyLanding } from '@/lib/wordTowerV2/landing';
import { NEUTRAL_PERKS, type Perks } from '@/lib/wordTowerV2/estate';
import { type RewardId, steadySwing } from '@/lib/wordTowerV2/rewards';
import { type RunState, type SurprisePayout, applyLanding, consumeDrop, createRun } from '@/lib/wordTowerV2/run';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '@/lib/wordTowerV2/scoring';
import { towerRisk } from '@/lib/wordTowerV2/stability';
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
  /** Everything a hoist spent, so putting the word back costs the player nothing. */
  const preHoistRef = useRef<{ run: RunState; longestWord: number } | null>(null);
  const bestRef = useRef(0);
  const beatBestRef = useRef(false);
  const statsRef = useRef<RunStats>(emptyStats());
  const unlockedRef = useRef<Set<string>>(new Set());
  const seenBiomesRef = useRef(new Set<string>(['downtown']));
  const bannerKeyRef = useRef(0);
  /**
   * Empire perks, fed in by the estate (NEUTRAL until it has loaded, so a run
   * that starts before auth settles simply plays unperked rather than flipping
   * mid-run). Every use multiplies through, so at level 0 this is identity.
   */
  const perksRef = useRef<Perks>(NEUTRAL_PERKS);
  const setPerks = useCallback((next: Perks) => {
    perksRef.current = next;
  }, []);

  const [phase, setPhase] = useState<Phase>('composing');
  const [heightM, setHeightM] = useState(0);
  /** 0..1, how close the standing tower is to going over (HUD meter only). */
  const [risk, setRisk] = useState(0);
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
      perksRef.current.perfectWindowMult,
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
      // Only what has landed: the slab on the hook swings by design.
      const standing = snapshotWorld(world).blocks.filter((b) => world.landed.has(b.id) && b.id !== hangingRef.current?.id);
      const next = towerRisk(standing.map((b) => ({ ...b, fixed: world.blocks.get(b.id)?.isStatic })));
      // Quantized: a settled stack jitters in the 3rd decimal and would re-render the HUD 10x/s.
      setRisk((shown) => (Math.abs(shown - next) < 0.03 ? shown : Math.round(next * 100) / 100));

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
    const world = worldRef.current;
    // Foundation perk: bleed off the settled tower's rocking. Pure damping —
    // it can only make an existing wobble smaller, never add motion — and at
    // swayMult 1 the loop is skipped entirely.
    const sway = perksRef.current.swayMult;
    if (sway < 1) {
      const damp = 1 - (1 - sway) * 0.25;
      for (const [id, body] of world.blocks) {
        if (body.isStatic || !world.landed.has(id)) continue;
        Body.setAngularVelocity(body, body.angularVelocity * damp);
      }
    }
    const hanging = hangingRef.current;
    if (!hanging) return;
    const { x } = releaseKinematics(nowMs - hanging.startedAt, hanging.swing, 0);
    moveAttachedBlock(world, hanging.id, x, -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX));
  }, []);

  /** Sideways speed (px/ms) the hanging floor would leave the hook with right now. */
  const getHangVx = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging || hanging.plumb) return 0;
    return releaseKinematics(performance.now() - hanging.startedAt, hanging.swing, 0).vx;
  }, []);

  /**
   * Width the next floor would get for `word`: the banked wide-load crate AND
   * the Foundation perk. The ghost slab and `hoist` must read the SAME numbers
   * or the block that lands is not the one the player aimed with.
   */
  const previewWidth = useCallback(
    (word: string) =>
      Math.round(blockWidthForWord(word) * runRef.current.nextWidthMult * (dropCountRef.current === 0 ? perksRef.current.baseWidthMult : 1)),
    [],
  );

  const hoist = useCallback(
    (word: string) => {
      if (phase !== 'composing') return;
      const world = worldRef.current;
      preHoistRef.current = { run: runRef.current, longestWord: statsRef.current.longestWord };
      const spent = consumeDrop(runRef.current);
      runRef.current = spent.run;
      setRun(spent.run);

      const id = `r${runNoRef.current}-b${dropCountRef.current}`;
      // Foundation perk: the GROUND floor is wider, so the whole tower starts
      // on a bigger footing. Later floors are untouched. Same predicate as
      // previewWidth, read BEFORE the counter moves.
      const perkWidth = dropCountRef.current === 0 ? perksRef.current.baseWidthMult : 1;
      dropCountRef.current += 1;
      labelsRef.current.set(id, word);
      spawnBlock(world, {
        id,
        x: 0,
        y: -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX),
        widthPx: Math.round(blockWidthForWord(word) * spent.widthMult * perkWidth),
        heightPx: BLOCK_HEIGHT_PX,
        vx: 0,
        attached: true,
      });
      // Crane Yard perk: a longer period is a slower, easier swing. Never
      // mutate the exported SWING — a copy per hoist.
      const perkSwing = { ...SWING, periodMs: SWING.periodMs * perksRef.current.swingPeriodMult };
      hangingRef.current = {
        id,
        startedAt: performance.now(),
        wordLen: word.length,
        swing: spent.steady ? steadySwing(perkSwing) : perkSwing,
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

  /**
   * Put the hanging word back on the wheel.
   *
   * Only legal while the slab still hangs: once it is released, physics owns it.
   * The block leaves the world entirely (engine `despawnBlock` — no orphan body
   * keeps colliding), the banked crate effects the hoist spent come back, and
   * the label is dropped so a cancelled word never reaches the share list.
   * Returns false when there is nothing to take back.
   */
  const cancelHoist = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging || phase !== 'swinging') return false;
    despawnBlock(worldRef.current, hanging.id);
    labelsRef.current.delete(hanging.id);
    hangingRef.current = null;
    const before = preHoistRef.current;
    if (before) {
      runRef.current = before.run;
      setRun(before.run);
      statsRef.current.longestWord = before.longestWord;
      preHoistRef.current = null;
    }
    setCallout(null);
    playSound('buttonClick', { volume: 0.5 });
    setPhase('composing');
    return true;
  }, [phase, playSound]);

  const drop = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging) return;
    // A new drop before the last one settled: judge the old one now.
    resolveLanding();
    const world = worldRef.current;
    const support = supportTop(world, hanging.id);
    const k = releaseKinematics(performance.now() - hanging.startedAt, hanging.swing, 0);
    // Foundation perk: less spin off the hook is a floor that lands flatter.
    releaseBlock(world, hanging.id, hanging.plumb ? 0 : k.vx, hanging.plumb ? 0 : k.spin * perksRef.current.swayMult);
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
    setRisk(0);
    setNewBest(false);
    setCallout(null);
    setBanners([]);
    setRunBadges([]);
    setPhase('composing');
  }, []);

  /**
   * The server's best (word_tower_estates.best_m) wins when it is higher: the
   * device copy is lost with a cleared cache or a new phone, and the HUD then
   * said 0 with no "new best" banner for a player whose record was 70m.
   */
  const adoptBest = useCallback((m: number) => {
    if (!(m > bestRef.current)) return;
    bestRef.current = m;
    setBestM(m);
    writeBest(m);
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
        // Lean cycles instead of growing: `index * 2.6` leant further every
        // floor, so a 20-floor review tower always toppled before you could see
        // the skies it was seeded to reach.
        x: (index % 2 === 0 ? 1 : -1) * (index % 4) * 2.6,
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
    phase, heightM, risk, peakM, bestM, run, callout, banners, shiftBanner, newBest, runBadges, unlockedRef, statsRef,
    onBeforeStep, getHangVx, previewWidth, hoist, cancelHoist, drop, restart, setScrambles, seedDemo, setPerks, perksRef, adoptBest,
  };
}
