'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import { type RunStats, emptyStats, loadUnlocked, newlyUnlocked, saveUnlocked } from '@/lib/wordTowerV2/achievements';
import { publishHeightM } from '@/lib/wordTowerV2/altitude';
import { biomeAt, floorsAt } from '@/lib/wordTowerV2/biomes';
import { BANNER_PRIORITY, type Banner, type BannerKind, type CalloutCopy, landingCallout, pushBanner, wordCallout } from '@/lib/wordTowerV2/celebrations';
import { CRANE_CLEARANCE_PX, SWING, releaseKinematics } from '@/lib/wordTowerV2/crane';
import {
  PX_PER_M,
  type TowerWorld,
  braceTower,
  createTowerWorld,
  despawnBlock,
  getTowerHeightM,
  moveAttachedBlock,
  releaseBlock,
  reviveWorld,
  snapshotWorld,
  spawnBlock,
  weldBelow,
} from '@/lib/wordTowerV2/engine';
import { type LandingQuality, classifyLanding, perkMadePerfect } from '@/lib/wordTowerV2/landing';
import { NEUTRAL_PERKS, type Perks } from '@/lib/wordTowerV2/estate';
import { steadySwing } from '@/lib/wordTowerV2/rewards';
import { v2DailySwing } from '@/lib/wordTowerV2/daily';
import { type RunState, type SurprisePayout, applyLanding, consumeDrop, createRun } from '@/lib/wordTowerV2/run';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '@/lib/wordTowerV2/scoring';
import { isCounterweight, standingChain, towerLean, towerRisk } from '@/lib/wordTowerV2/stability';
import { endV2Run, startV2Run } from '@/lib/wordTowerV2/telemetry';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { TowerFx } from './TowerCanvas';
import { type Hanging, LANDING_SOUND, type PendingLanding, REWARD_SOUND, dampSway, recordLanding, readBest, seedDemoTower, standing, supportTop, writeBest } from './runHelpers';

/**
 * Word Tower v2 run loop: spawns/releases floors, judges the SETTLED sim, opens
 * crates, awards badges. A crash that leaves floors standing clears the rubble
 * and the run goes on; it ends when nothing stands or the player cashes out.
 */

const POLL_MS = 100;
/** Stop waiting for a floor to settle after this long and judge it anyway. */
const SETTLE_TIMEOUT_MS = 2600;
/** Floors the rebar crate leaves live at the top. */
const REBAR_KEEP_TOP = 2;

export type Phase = 'composing' | 'swinging' | 'over';

export interface CalloutEvent extends CalloutCopy {
  key: number;
  points: number;
}

export type SurpriseEvent = SurprisePayout & { key: number };

export function useTowerRun(opts?: { seed?: number; scriptedSwing?: boolean }) {
  const dailySeed = opts?.seed;
  const scriptedSwing = !!opts?.scriptedSwing;
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
  const startedAtRef = useRef<number | null>(null);
  /** Emergency braces this run: `paid` ones are charged at the bank (RunSummary.braces). */
  const bracesRef = useRef({ used: 0, paid: 0 });
  /** The tower's lean just before the current drop, for the counterweight check. */
  const leanRef = useRef<number | null>(null);
  /** Guard: endRun already fired the event for this run. */
  const endedRef = useRef(false);
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
    runRef.current = createRun(dailySeed ?? Date.now());
    if (dailySeed) worldRef.current = createTowerWorld({ seed: dailySeed });
    setRun(runRef.current);
  }, [dailySeed]);

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

    const landed = { x: block.x, bottomY: block.y + block.heightPx / 2, angleRad: block.angleRad };
    const quality: LandingQuality = classifyLanding(landed, pending.support, perksRef.current.perfectWindowMult);
    const out = applyLanding(runRef.current, { quality, wordLen: pending.wordLen });
    runRef.current = out.run;
    setRun(out.run);
    fxRef.current.push({ kind: 'land', id: pending.id, quality });
    if (out.tenants > 0) fxRef.current.push({ kind: 'tenants', id: pending.id, count: out.tenants });
    // Crane Yard: name the upgrade when its wider band is what made this perfect.
    const copy = perkMadePerfect(landed, pending.support, perksRef.current.perfectWindowMult)
      ? { textKey: 'wordTowerV2.rescue.craneSaved', tone: 'cyan' as const } : landingCallout(quality, out.run.combo, Math.random());
    setCallout({ ...copy, key: performance.now(), points: out.points });

    // Counterweight: this floor landed on the far side of a lean and pulled
    // the load back over the base. Physics already moved the centre of mass;
    // the reward is that the crew locks the steadier tower in (all but the
    // top two floors are welded, like the rebar crate).
    const leanBefore = leanRef.current;
    leanRef.current = null;
    const base = snapshotWorld(worldRef.current).blocks.find((b) => b.id === `r${runNoRef.current}-b0`);
    if (leanBefore !== null && base && quality !== 'miss') {
      const after = towerLean(standing(worldRef.current, null));
      if (isCounterweight(leanBefore, after, block.x - base.x, base.widthPx / 2)) {
        const ids = braceTower(worldRef.current, 2);
        if (ids.length) fxRef.current.push({ kind: 'rebar', ids });
        setCallout({ textKey: 'wordTowerV2.rescue.counterweight', tone: 'cyan', key: performance.now() + 1, points: out.points });
        playSound('powerUp', { volume: 0.6 });
      }
    }

    if (quality === 'perfect' && out.run.combo > 1) playComboSound(out.run.combo);
    else playSound(LANDING_SOUND[quality]);

    if (out.reward) openCrate(out.reward, pending.id);

    recordLanding(statsRef.current, out.run, quality);
    checkBadges();
  }, [playComboSound, playSound, openCrate, checkBadges]);

  /** `cashedOut`: the player ended a standing run — a win, not a fall. */
  const endRun = useCallback((cashedOut = false) => {
    // Guard: already ended, don't fire event twice
    if (endedRef.current) return;

    resolveLanding();
    hangingRef.current = null;
    const peak = worldRef.current.runPeakPx / PX_PER_M;
    setPeakM(peak);
    if (peak > bestRef.current) {
      bestRef.current = peak;
      setBestM(peak);
      writeBest(peak);
    }
    if (cashedOut) playSound('questComplete');
    else {
      fxRef.current.push({ kind: 'collapse' });
      playSound('defeatSting');
    }
    setPhase('over');
    endV2Run(startedAtRef, {
      floors: statsRef.current.peakFloors,
      heightM: peak,
    });
    // Mark run as ended to prevent double-firing the event
    endedRef.current = true;
    // Track engagement: run ended with cause (crash or cashout)
    trackGrowthEvent('wt2_run_ended', {
      daily: !!dailySeed,
      heightM: peak,
      floors: statsRef.current.peakFloors,
      cause: cashedOut ? 'cashout' : 'crash',
    });
  }, [playSound, resolveLanding, dailySeed]);

  /**
   * The tower came down — but if floors are still standing on the base, the
   * run is NOT over: the rubble is cleared, the streak breaks, and you build on
   * from what is left. Returns false when nothing stands (the run ends).
   */
  const recover = useCallback((): boolean => {
    const world = worldRef.current;
    const hangId = hangingRef.current?.id ?? null;
    const keep = standingChain(standing(world, hangId), `r${runNoRef.current}-b0`);
    if (keep.length === 0) return false;
    // The slab on the hook and anything still in the air are not rubble.
    for (const b of snapshotWorld(world).blocks) if (b.id === hangId || !world.landed.has(b.id)) keep.push(b.id);
    const rubble = reviveWorld(world, new Set(keep));
    for (const r of rubble) labelsRef.current.delete(r.id);
    runRef.current = { ...runRef.current, combo: 0 };
    setRun(runRef.current);
    fxRef.current.push({ kind: 'crumble', points: rubble });
    setCallout({ textKey: 'wordTowerV2.rescue.crumbled', tone: 'red', params: { n: rubble.length }, key: performance.now(), points: 0 });
    playSound('comboBreak');
    return true;
  }, [playSound]);

  /**
   * Emergency brace: steel every floor but the top one in place, right now.
   * Paying for it (coins off the run, or a free brace from the upgrades, or a
   * rescue word) is decided by the caller; `paid` ones reach the bank.
   */
  const brace = useCallback(
    (paid: boolean): boolean => {
      if (phase === 'over') return false;
      const ids = braceTower(worldRef.current, 1);
      if (ids.length === 0) return false;
      bracesRef.current = { used: bracesRef.current.used + 1, paid: bracesRef.current.paid + (paid ? 1 : 0) };
      statsRef.current.welds += 1;
      fxRef.current.push({ kind: 'rebar', ids });
      setCallout({ textKey: 'wordTowerV2.rescue.braced', tone: 'cyan', key: performance.now(), points: 0 });
      playSound('vaultUnlock', { volume: 0.6 });
      return true;
    },
    [phase, playSound],
  );

  /** Cash out: end a standing run on purpose (the results + chest follow). */
  const finish = useCallback(() => {
    if (phase === 'over') return;
    const hanging = hangingRef.current;
    if (hanging) despawnBlock(worldRef.current, hanging.id);
    endRun(true);
  }, [phase, endRun]);

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
        if (!recover()) endRun();
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
  }, [phase, endRun, recover, resolveLanding, playSound, banner, checkBadges]);

  /** Drives the crane: the hanging floor follows the swing until released. */
  const onBeforeStep = useCallback((nowMs: number) => {
    const world = worldRef.current;
    dampSway(world, perksRef.current.swayMult);
    const hanging = hangingRef.current;
    if (!hanging) return;
    const { x } = releaseKinematics(nowMs - hanging.startedAt, hanging.swing, hanging.pivotX);
    moveAttachedBlock(world, hanging.id, x, -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX));
  }, []);

  /** Sideways speed (px/ms) the hanging floor would leave the hook with right now. */
  const getHangVx = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging || hanging.plumb) return 0;
    return releaseKinematics(performance.now() - hanging.startedAt, hanging.swing, hanging.pivotX).vx;
  }, []);

  /** Crane pivot while a floor hangs; null between hoists (the canvas uses the top floor). */
  const getCraneX = useCallback(() => hangingRef.current?.pivotX ?? null, []);

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
      startV2Run(startedAtRef);
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
      const dropIndex = dropCountRef.current;
      dropCountRef.current += 1;
      // The crane swings over the tower as it stands NOW. Latched for the whole
      // swing: a pivot that tracked a still-rocking top would wander mid-aim.
      const pivotX = supportTop(world, null)?.x ?? 0;
      labelsRef.current.set(id, word);
      spawnBlock(world, {
        id,
        x: pivotX,
        y: -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX),
        widthPx: Math.round(blockWidthForWord(word) * spent.widthMult * perkWidth),
        heightPx: BLOCK_HEIGHT_PX,
        vx: 0,
        attached: true,
      });
      const perkSwing = { ...SWING, periodMs: SWING.periodMs * perksRef.current.swingPeriodMult };
      const scripted = scriptedSwing && dailySeed ? v2DailySwing(dailySeed, dropIndex) : perkSwing;
      hangingRef.current = {
        id,
        startedAt: performance.now(),
        wordLen: word.length,
        swing: spent.steady ? steadySwing(scripted) : scripted,
        plumb: spent.plumb,
        pivotX,
      };
      statsRef.current.longestWord = Math.max(statsRef.current.longestWord, word.length);
      const big = wordCallout(word.length);
      if (big) {
        setCallout({ textKey: big, tone: 'purple', key: performance.now(), points: 0 });
        playSound('longWordBonus');
      } else playWordLengthSound(word.length);
      setPhase('swinging');
    },
    [phase, playWordLengthSound, playSound, dailySeed, scriptedSwing],
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
    leanRef.current = towerLean(standing(world, hanging.id));
    const k = releaseKinematics(performance.now() - hanging.startedAt, hanging.swing, hanging.pivotX);
    // Foundation perk: less spin off the hook is a floor that lands flatter.
    releaseBlock(world, hanging.id, hanging.plumb ? 0 : k.vx, hanging.plumb ? 0 : k.spin * perksRef.current.swayMult);
    pendingRef.current = { id: hanging.id, wordLen: hanging.wordLen, support, releasedAt: performance.now() };
    hangingRef.current = null;
    playSound('swipeTransition', { volume: 0.4 });
    setPhase('composing');
  }, [playSound, resolveLanding]);

  const restart = useCallback(() => {
    startedAtRef.current = null;
    runNoRef.current += 1;
    dropCountRef.current = 0;
    worldRef.current = createTowerWorld({ seed: dailySeed ?? runNoRef.current });
    labelsRef.current = new Map();
    hangingRef.current = null;
    pendingRef.current = null;
    beatBestRef.current = false;
    bracesRef.current = { used: 0, paid: 0 };
    leanRef.current = null;
    endedRef.current = false;
    statsRef.current = emptyStats();
    seenBiomesRef.current = new Set(['downtown']);
    runRef.current = createRun(dailySeed ?? Date.now());
    setRun(runRef.current);
    setHeightM(0);
    setRisk(0);
    setNewBest(false);
    setCallout(null);
    setBanners([]);
    setRunBadges([]);
    setPhase('composing');
  }, [dailySeed]);

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
  const seedDemo = useCallback((words?: string[]) => {
    if (dropCountRef.current > 0) return; // StrictMode double-invoke guard
    dropCountRef.current = seedDemoTower(worldRef.current, labelsRef.current, words);
  }, []);

  return {
    worldRef, labelsRef, fxRef, hangingRef,
    phase, heightM, risk, peakM, bestM, run, callout, banners, shiftBanner, newBest, runBadges, unlockedRef, statsRef,
    onBeforeStep, getHangVx, getCraneX, previewWidth, hoist, cancelHoist, drop, restart, setScrambles, seedDemo, setPerks, perksRef, adoptBest,
    brace, finish, bracesRef,
  };
}
