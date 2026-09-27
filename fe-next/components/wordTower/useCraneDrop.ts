'use client';

import { useCallback, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHaptics } from '@/hooks/useHaptics';
import type { HazardKind } from '@/lib/wordTower/hazards';
import {
  nextConsecutiveSloppy,
  nextPerfectStreak,
  perfectStreakBonus,
  TOPPLE_AFTER_SLOPPY,
  type PlacementOutcome,
} from '@/lib/wordTower/cranePlacement';
import { leanFromOffsets, pushLeanOffset, relaxLean } from '@/lib/wordTower/towerLean';
import {
  evaluateClutch,
  clutchSaveIntensity,
  isOnBrink,
  stabilizeAfterClutch,
  type ClutchOutcome,
} from '@/lib/wordTower/clutchSave';
import { NO_MODIFIERS, reducedTopple, type PerkModifiers } from '@/lib/wordTower/perks';

/**
 * useCraneDrop — owns the Crane Stack drop reaction (extracted from
 * WordTowerPlay to keep it under the 500-line cap and to make the drop
 * decisions testable in isolation).
 *
 * Applies the cosy reward-amplifier model: drop quality scales the height
 * granted; a run of perfects earns escalating bonus height (the "just one more"
 * hook); a third bad drop in a row wobbles the just-placed floor off (reusing
 * the hazard pipeline, recoverable). Returns the live streak counts so the
 * crane overlay can compute the next drop's topple consistently.
 *
 * Tracks the rolling window of signed drop offsets so the scene can render a
 * VISIBLE tower lean (recent-weighted) — instability you can SEE before the
 * topple lands. Lean resets when a topple recovers the tower.
 */
export function useCraneDrop(
  commit: (multiplier: number, signedOffset: number) => void,
  hazard: (floors: number, kind: HazardKind, ids: string[]) => void,
  mods: PerkModifiers = NO_MODIFIERS,
  /** Word-aware height × for the held word (daily mutator). Default 1 = no twist. */
  wordHeightMult: () => number = () => 1,
  /** Lean-recovery multiplier (Quick Recovery upgrade); >1 straightens the tower
   *  faster after a clean drop. Read as a getter so the live upgrade level applies
   *  without re-creating the stable onDrop callback. Default 1 = base game. */
  leanRelaxMult: () => number = () => 1,
  /** Passive lean-pull multiplier (Center Magnet upgrade); applied on EVERY drop
   *  including misses, so bad drops still nudge the tower toward centre.
   *  Default 1 = no-op (base game unchanged). */
  passiveLeanResetMult: () => number = () => 1,
) {
  // Keep perk modifiers current without re-creating the stable onDrop callback.
  const modsRef = useRef(mods);
  modsRef.current = mods;
  const wordMultRef = useRef(wordHeightMult);
  wordMultRef.current = wordHeightMult;
  const leanRelaxRef = useRef(leanRelaxMult);
  leanRelaxRef.current = leanRelaxMult;
  const passiveLeanResetRef = useRef(passiveLeanResetMult);
  passiveLeanResetRef.current = passiveLeanResetMult;

  const sloppyRef = useRef(0);
  const perfectRef = useRef(0);
  const leanHistoryRef = useRef<number[]>([]);
  // The signed error of the drop currently landing. The crane reports it via
  // `pushSignedOffset` immediately before `onDrop`, and the commit stores it on
  // the floor so the scene can lay that floor at the offset it truly landed at.
  const lastSignedRef = useRef(0);
  // Lean at the moment of the drop — snapshotted before the new offset lands, so
  // it sizes the celebration by how wild the rescue looked.
  const preDropLeanRef = useRef(0);
  const clutchKeyRef = useRef(1);
  const [streaks, setStreaks] = useState({ sloppy: 0, perfect: 0, leanDeg: 0 });
  const [clutch, setClutch] = useState<{ outcome: ClutchOutcome; intensity: number; key: number } | null>(null);

  const { playPerfectWordSound, playWordAcceptedSound, playErrorSound } = useSoundEffects();
  const haptics = useHaptics();

  /** Record the signed (−1..+1) drop offset for the rolling lean window. */
  const pushSignedOffset = useCallback((signed: number) => {
    lastSignedRef.current = Math.max(-1, Math.min(1, signed));
    preDropLeanRef.current = leanFromOffsets(leanHistoryRef.current);
    leanHistoryRef.current = pushLeanOffset(leanHistoryRef.current, signed);
    setStreaks((s) => ({ ...s, leanDeg: leanFromOffsets(leanHistoryRef.current) }));
  }, []);

  const onDrop = useCallback(
    (o: PlacementOutcome) => {
      const m = modsRef.current;
      // Was the tower one bad drop from falling? `sloppyRef` still holds the count
      // BEFORE this drop. `reinforced` (brinkExtra) widens how many shaky drops it
      // takes — subtracting it from the count raises the effective brink threshold.
      const preLean = preDropLeanRef.current;
      const verdict = evaluateClutch(isOnBrink(sloppyRef.current - m.brinkExtra), o.quality);

      perfectRef.current = nextPerfectStreak(perfectRef.current, o.quality);
      // masterCrane adds to the perfect bonus; tallTimber lifts every floor.
      const base =
        o.quality === 'perfect'
          ? o.heightMultiplier * (1 + perfectStreakBonus(perfectRef.current) + m.perfectBonus)
          : o.heightMultiplier;
      // The day's word-aware twist (golden letter / vowels / length) rides on top.
      commit(base * m.heightMult * wordMultRef.current(), lastSignedRef.current);

      // A topple lands from the usual miss-after-grace OR a fumbled clutch — but
      // `reinforced` can hold it back, and `cushion`/`featherfall` make the crane
      // wobble harmless (0 floors lost, still a recovery).
      let topples = o.topples || verdict === 'topple';
      // reinforced (brinkExtra > 0) holds back a normal topple until enough extra
      // bad drops stack. With no perk this is a no-op (original behaviour).
      if (m.brinkExtra > 0 && topples && verdict !== 'topple' && sloppyRef.current < TOPPLE_AFTER_SLOPPY + m.brinkExtra) {
        topples = false;
      }
      const wobbleFloors = m.wobbleImmune ? 0 : reducedTopple(1, m);
      sloppyRef.current = topples ? 0 : nextConsecutiveSloppy(sloppyRef.current, o.quality);

      if (verdict === 'save') {
        // Pulled it back from the brink — snap upright, biggest celebration in the game.
        leanHistoryRef.current = stabilizeAfterClutch();
        playPerfectWordSound();
        haptics.levelComplete();
        setClutch({ outcome: 'save', intensity: clutchSaveIntensity(preLean), key: clutchKeyRef.current++ });
      } else if (topples) {
        // wobbleFloors may be 0 under cushion/featherfall — then it's a free recovery.
        if (wobbleFloors > 0) hazard(wobbleFloors, 'wobble', [`crane-wobble-${Date.now()}`]);
        // Topple = the tower is RECOVERED — clear the visible lean.
        // (Topple SFX/haptics fire downstream via the hazard effect, so no sound here.)
        leanHistoryRef.current = [];
        if (verdict === 'topple') {
          setClutch({ outcome: 'topple', intensity: clutchSaveIntensity(preLean), key: clutchKeyRef.current++ });
        }
      }
      else if (o.quality === 'perfect') { playPerfectWordSound(); haptics.levelComplete(); }
      else if (o.quality === 'miss') { playErrorSound(); haptics.bossHit(); }
      else { playWordAcceptedSound(); haptics.selection(); }

      // Quick Recovery: a clean drop straightens the tower FASTER — pull the lean
      // window toward upright by the upgrade's multiplier (no-op at ×1).
      if (verdict !== 'save' && !topples && (o.quality === 'perfect' || o.quality === 'good')) {
        leanHistoryRef.current = relaxLean(leanHistoryRef.current, leanRelaxRef.current());
      }
      // Center Magnet: passive pull toward centre on EVERY drop (even misses).
      // Stacks with Quick Recovery on clean drops. No-op at mult=1 (base game).
      const passive = passiveLeanResetRef.current();
      if (passive > 1) {
        leanHistoryRef.current = relaxLean(leanHistoryRef.current, passive);
      }

      setStreaks({
        sloppy: sloppyRef.current,
        perfect: perfectRef.current,
        leanDeg: leanFromOffsets(leanHistoryRef.current),
      });
    },
    [commit, hazard, playPerfectWordSound, playWordAcceptedSound, playErrorSound, haptics],
  );

  return {
    onDrop,
    pushSignedOffset,
    consecutiveSloppy: streaks.sloppy,
    perfectStreak: streaks.perfect,
    leanDeg: streaks.leanDeg,
    /** True when the next drop is do-or-die (HUD can flash a warning). */
    critical: isOnBrink(streaks.sloppy - mods.brinkExtra),
    /** Last clutch beat — bump `.key` drives the scene's snap-back + bass FX. */
    clutch,
  };
}
