'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import { type RunStats, emptyStats, loadUnlocked } from '@/lib/wordTowerV2/achievements';
import { publishHeightM } from '@/lib/wordTowerV2/altitude';
import { biomeAt, floorsAt } from '@/lib/wordTowerV2/biomes';
import { type CalloutCopy, landingCallout, wordCallout } from '@/lib/wordTowerV2/celebrations';
import { CRANE_CLEARANCE_PX, SWING, releaseKinematics } from '@/lib/wordTowerV2/crane';
import {
  PX_PER_M,
  type TowerWorld,
  braceTower,
  createTowerWorld,
  densityForTrait,
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
import { endV2Run, newFloorLog, startV2Run, trackFloorPlaced } from '@/lib/wordTowerV2/telemetry';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { TowerFx } from './TowerCanvas';
import { MAGNET_VX_MUL, landingModsFor } from './rush/rushHelpers';
import type { RushApi } from './rush/useRush';
import { useRushBridge } from './rush/useRushBridge';
import { useRunBanners } from './useRunBanners';
import { type Hanging, LANDING_SOUND, type PendingLanding, REWARD_SOUND, dampSway, recordLanding, readBest, seedDemoTower, seededPeakM, standing, supportTop, writeBest } from './runHelpers';

/** Word Tower v2 run loop: judges the SETTLED sim; a crash that leaves floors standing clears the rubble and the run goes on. */
const POLL_MS = 100;
/** Stop waiting for a floor to settle after this long and judge it anyway. */
const SETTLE_TIMEOUT_MS = 2600;
/** Floors the rebar crate leaves live at the top. */
const REBAR_KEEP_TOP = 2;

export type Phase = 'composing' | 'swinging' | 'draft' | 'over';

export interface CalloutEvent extends CalloutCopy {
  key: number;
  points: number;
}

export type SurpriseEvent = SurprisePayout & { key: number };

export function useTowerRun(opts?: { seed?: number; scriptedSwing?: boolean; rush?: RushApi }) {
  const dailySeed = opts?.seed;
  const scriptedSwing = !!opts?.scriptedSwing;
  const baseIdRef = useRef<string | null>(null);
  const { playSound, playComboSound, playWordLengthSound, setGameActive } = useSoundEffects();

  const worldRef = useRef<TowerWorld>(createTowerWorld({ seed: 1 }));
  const labelsRef = useRef(new Map<string, string>());
  const fxRef = useRef<TowerFx[]>([]);
  const runRef = useRef<RunState>(createRun(1));
  const runNoRef = useRef(0);
  const dropCountRef = useRef(0);
  const floorLogRef = useRef(newFloorLog().current);
  const hangingRef = useRef<Hanging | null>(null);
  const pendingRef = useRef<PendingLanding | null>(null);
  /** Everything a hoist spent, so putting the word back costs the player nothing. */
  const preHoistRef = useRef<{ run: RunState; longestWord: number } | null>(null);
  const bestRef = useRef(0);
  const prevBestRef = useRef(0);
  const beatBestRef = useRef(false);
  const statsRef = useRef<RunStats>(emptyStats());
  const unlockedRef = useRef<Set<string>>(new Set());
  const seenBiomesRef = useRef(new Set<string>(['downtown']));
  const startedAtRef = useRef<number | null>(null);
  /** Emergency braces this run: `paid` ones are charged at the bank (RunSummary.braces). */
  const bracesRef = useRef({ used: 0, paid: 0 });
  /** The tower's lean just before the current drop, for the counterweight check. */
  const leanRef = useRef<number | null>(null);
  /** Guard: endRun already fired the event for this run. */
  const endedRef = useRef(false);
  /** Estate perks: NEUTRAL until loaded, so a run started before auth plays unperked instead of flipping mid-run. */
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
  const [newBest, setNewBest] = useState(false);
  const { banners, setBanners, runBadges, setRunBadges, banner, shiftBanner, checkBadges } = useRunBanners(statsRef, unlockedRef, playSound);
  const { rushRef, traitRef, draftingRef, rushMods, maybeOpenDraft, windowMultFor, takeTrait, returnTrait, resetRush, pickPerk, getPerfectWindowMult, getTrait } =
    useRushBridge({ rush: opts?.rush, hangingRef, perksRef, setPhase });

  useEffect(() => {
    bestRef.current = readBest();
    setBestM(bestRef.current);
    unlockedRef.current = loadUnlocked();
    runRef.current = createRun(dailySeed ?? Date.now());
    rushRef.current?.reset(runRef.current.seed);
    if (dailySeed) worldRef.current = createTowerWorld({ seed: dailySeed });
    setRun(runRef.current);
  }, [dailySeed, rushRef]);

  // Without this every playSound() silently no-ops: the context gates on it.
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

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
    const trait = traitRef.current.get(pending.id);
    const quality: LandingQuality = classifyLanding(landed, pending.support, windowMultFor(trait));
    const out = applyLanding(runRef.current, { quality, wordLen: pending.wordLen }, landingModsFor(rushMods(), trait));
    rushRef.current?.onLanding(quality);
    runRef.current = out.run;
    setRun(out.run);
    trackFloorPlaced(floorLogRef, runNoRef.current, out.run.floors, dailySeed != null, pending.wordLen);
    fxRef.current.push({ kind: 'land', id: pending.id, quality, combo: out.run.combo });
    if (out.tenants > 0) fxRef.current.push({ kind: 'tenants', id: pending.id, count: out.tenants });
    // Crane Yard: name the upgrade when its wider band is what made this perfect.
    const copy = perkMadePerfect(landed, pending.support, perksRef.current.perfectWindowMult)
      ? { textKey: 'wordTowerV2.rescue.craneSaved', tone: 'cyan' as const } : landingCallout(quality, out.run.combo, Math.random());
    setCallout({ ...copy, key: performance.now(), points: out.points });

    // Counterweight: a floor that pulled a lean back over the base welds all but the top two floors.
    const leanBefore = leanRef.current;
    leanRef.current = null;
    const base = snapshotWorld(worldRef.current).blocks.find((b) => b.id === baseIdRef.current);
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
  }, [playComboSound, playSound, openCrate, checkBadges, windowMultFor, rushMods, rushRef, traitRef, dailySeed]);

  /** `cashedOut`: the player ended a standing run — a win, not a fall. */
  const endRun = useCallback((cashedOut = false) => {
    if (endedRef.current) return;

    resolveLanding();
    hangingRef.current = null;
    const peak = worldRef.current.runPeakPx / PX_PER_M;
    setPeakM(peak);
    prevBestRef.current = bestRef.current;
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
      daily: !!dailySeed,
    });
    endedRef.current = true;
    trackGrowthEvent('wt2_run_ended', {
      daily: !!dailySeed,
      heightM: peak,
      floors: statsRef.current.peakFloors,
      cause: cashedOut ? 'cashout' : 'crash',
    });
  }, [playSound, resolveLanding, dailySeed]);

  /** Floors still standing on the base keep the run alive: rubble clears, the streak breaks. False when nothing stands. */
  const recover = useCallback((): boolean => {
    const world = worldRef.current;
    const hangId = hangingRef.current?.id ?? null;
    const keep = standingChain(standing(world, hangId), baseIdRef.current ?? 'none');
    // Safety Net perk: a fall that would end the run clears it all instead, streak kept; the next floor is the new base.
    const netted = keep.length === 0 && !!rushRef.current?.consumeFreeRecovery();
    if (keep.length === 0 && !netted) return false;
    // The slab on the hook and anything still in the air are not rubble.
    for (const b of snapshotWorld(world).blocks) if (b.id === hangId || !world.landed.has(b.id)) keep.push(b.id);
    if (netted) baseIdRef.current = keep[0] ?? null;
    const rubble = reviveWorld(world, new Set(keep));
    for (const r of rubble) labelsRef.current.delete(r.id);
    if (!netted) {
      runRef.current = { ...runRef.current, combo: 0 };
      setRun(runRef.current);
    }
    fxRef.current.push({ kind: 'crumble', points: rubble });
    const copy = netted
      ? { textKey: 'wordTowerV2.rush.safetyNetSaved', tone: 'cyan' as const }
      : { textKey: 'wordTowerV2.rescue.crumbled', tone: 'red' as const, params: { n: rubble.length } };
    setCallout({ ...copy, key: performance.now(), points: 0 });
    playSound(netted ? 'powerUp' : 'comboBreak');
    return true;
  }, [playSound, rushRef]);

  /** Emergency brace: steel every floor but the top one. The caller decides payment; `paid` ones reach the bank. */
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
      rushRef.current?.onPeak(world.runPeakPx / PX_PER_M);

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
      if (!pendingRef.current && !hangingRef.current) maybeOpenDraft();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [phase, endRun, recover, resolveLanding, playSound, banner, checkBadges, maybeOpenDraft, rushRef]);

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

  /** The ghost slab and `hoist` must read the SAME width, or the block that lands is not the one aimed with. */
  const floorWidth = useCallback(
    (word: string, crateMult: number) =>
      Math.round(blockWidthForWord(word) * crateMult * (dropCountRef.current === 0 ? perksRef.current.baseWidthMult : 1) * rushMods().widthMul),
    [rushMods],
  );
  const previewWidth = useCallback((word: string) => floorWidth(word, runRef.current.nextWidthMult), [floorWidth]);

  const hoist = useCallback(
    (word: string) => {
      if (phase !== 'composing' || draftingRef.current) return;
      startV2Run(startedAtRef);
      const world = worldRef.current;
      preHoistRef.current = { run: runRef.current, longestWord: statsRef.current.longestWord };
      const spent = consumeDrop(runRef.current);
      runRef.current = spent.run;
      setRun(spent.run);

      const id = `r${runNoRef.current}-b${dropCountRef.current}`;
      // Read BEFORE the counter moves: the Foundation perk widens only the ground floor.
      const widthPx = floorWidth(word, spent.widthMult);
      const trait = takeTrait(id);
      baseIdRef.current ??= id;
      const dropIndex = dropCountRef.current;
      dropCountRef.current += 1;
      // Latched for the whole swing: a pivot tracking a still-rocking top would wander mid-aim.
      const pivotX = supportTop(world, null)?.x ?? 0;
      labelsRef.current.set(id, word);
      spawnBlock(world, {
        id,
        x: pivotX,
        y: -(getTowerHeightM(world) * PX_PER_M + CRANE_CLEARANCE_PX),
        widthPx,
        heightPx: BLOCK_HEIGHT_PX,
        vx: 0,
        attached: true,
        density: densityForTrait(trait),
      });
      const perkSwing = { ...SWING, periodMs: (SWING.periodMs * perksRef.current.swingPeriodMult) / rushMods().swingSpeedMul };
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
    [phase, playWordLengthSound, playSound, dailySeed, scriptedSwing, floorWidth, draftingRef, takeTrait, rushMods],
  );

  /** Put the hanging word back on the wheel for free: only while it still hangs; everything the hoist spent comes back. */
  const cancelHoist = useCallback(() => {
    const hanging = hangingRef.current;
    if (!hanging || phase !== 'swinging') return false;
    despawnBlock(worldRef.current, hanging.id);
    labelsRef.current.delete(hanging.id);
    hangingRef.current = null;
    returnTrait(hanging.id);
    if (baseIdRef.current === hanging.id) baseIdRef.current = null;
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
  }, [phase, playSound, returnTrait]);

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
    const vxMul = traitRef.current.get(hanging.id) === 'magnet' ? MAGNET_VX_MUL : 1;
    releaseBlock(world, hanging.id, hanging.plumb ? 0 : k.vx * vxMul, hanging.plumb ? 0 : k.spin * perksRef.current.swayMult);
    pendingRef.current = { id: hanging.id, wordLen: hanging.wordLen, support, releasedAt: performance.now() };
    hangingRef.current = null;
    playSound('swipeTransition', { volume: 0.4 });
    setPhase('composing');
  }, [playSound, resolveLanding, traitRef]);

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
    resetRush(runRef.current.seed);
    baseIdRef.current = null;
    setRun(runRef.current);
    setHeightM(0);
    setRisk(0);
    setNewBest(false);
    setCallout(null);
    setBanners([]);
    setRunBadges([]);
    setPhase('composing');
  }, [dailySeed, resetRush, setBanners, setRunBadges]);

  /** The server's best wins when higher: the device copy is lost with a cleared cache or a new phone. */
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

  /** A seeded tower is not climbed this run: no drafts or overtakes for floors already there. */
  const adoptSeededTower = useCallback(() => {
    baseIdRef.current = 'r0-b0';
    rushRef.current?.baseline(seededPeakM(worldRef.current, dropCountRef.current));
  }, [rushRef]);

  /** Review hook (`?demo=1`, optionally `&words=a,b,c` to see another script). */
  const seedDemo = useCallback((words?: string[]) => {
    if (dropCountRef.current > 0) return; // StrictMode double-invoke guard
    dropCountRef.current = seedDemoTower(worldRef.current, labelsRef.current, words);
    adoptSeededTower();
  }, [adoptSeededTower]);

  /** Rebuild the persisted daily tower (short settle per floor); a second call on a built world is a no-op. */
  const restoreTower = useCallback((words: string[]): number => {
    if (dropCountRef.current > 0 || words.length === 0) return 0;
    dropCountRef.current = seedDemoTower(worldRef.current, labelsRef.current, words, 250);
    adoptSeededTower();
    return dropCountRef.current;
  }, [adoptSeededTower]);
  return {
    worldRef, labelsRef, fxRef, hangingRef,
    phase, heightM, risk, peakM, bestM, run, callout, banners, shiftBanner, newBest, runBadges, unlockedRef, statsRef,
    onBeforeStep, getHangVx, getCraneX, previewWidth, hoist, cancelHoist, drop, restart, setScrambles, seedDemo, restoreTower, setPerks, perksRef, adoptBest,
    brace, finish, bracesRef, pickPerk, getPerfectWindowMult, getTrait, traitRef, prevBestRef,
  };
}
