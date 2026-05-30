'use client';

// useBlastWordHandler — orchestrates the "word accepted" pipeline:
//   path → combos → animate clear → engine.submitWord → score fly →
//   combo flash → haptics + sounds → screen shake → near-miss → cascade.
//
// Extracted from BlastGame.tsx to keep that file under the 500-line cap.
// State is owned by BlastGame and passed in via the `effects` setter bag;
// refs are passed in so unmount-cleanup remains anchored in the parent.

import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { detectSpecialCombos, type SpecialCombo } from '../utils/blastCombos';
import { detectNearMiss } from '../utils/blastNearMiss';
import { vibrateBlastBomb, vibrateBlastLightning, vibrateBlastPrism } from '@/components/grid/hapticFeedback';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { hasGemLetter } from '@/lib/blast/gemLetters';
import { blastLetterBonus } from '@/lib/blast/blastLetterBonus';
import type { BlastTileType, BlastGameConfig } from '../types';
import type { ScoreFlyEvent } from '../BlastScoreFly';
import type { ClearedTileEvent } from '../BlastEffectsCanvas';
import type { HighlightRecorder } from '@/lib/blast/highlightRecorder';
import type { useBlastEngine } from './useBlastEngine';
import type { useBlastSequencer } from './useBlastSequencer';
import type { useBlastSounds } from './useBlastSounds';

type BlastEngine = ReturnType<typeof useBlastEngine>;
type BlastSequencer = ReturnType<typeof useBlastSequencer>;
type BlastSounds = ReturnType<typeof useBlastSounds>;

interface WordHandlerEffects {
  setLastWordLength: Dispatch<SetStateAction<number>>;
  setWordSubmitCount: Dispatch<SetStateAction<number>>;
  setWordFoundParticle: Dispatch<SetStateAction<number>>;
  setClearedTilesForEffects: Dispatch<SetStateAction<ClearedTileEvent[]>>;
  setScoreFlyEvents: Dispatch<SetStateAction<ScoreFlyEvent[]>>;
  setComboFlash: Dispatch<SetStateAction<{ id: string; tier: 1 | 2 | 3 } | null>>;
  setComboTypeName: Dispatch<SetStateAction<string | undefined>>;
  setComboParticle: Dispatch<SetStateAction<number>>;
  setExplosionShake: Dispatch<SetStateAction<number>>;
  setNearMissCells: Dispatch<SetStateAction<Array<{ row: number; col: number }>>>;
}

interface UseBlastWordHandlerParams {
  engine: BlastEngine;
  sequencer: BlastSequencer;
  sounds: BlastSounds;
  runCascade: (seedLen: number) => Promise<number>;
  lastPathRef: MutableRefObject<Array<{ row: number; col: number }>>;
  flyIdRef: MutableRefObject<number>;
  explosionShakeTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  nearMissTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  onWordWithComboTypeRef: MutableRefObject<((word: string, comboType: string | null) => void) | undefined>;
  onComboDetected?: (combos: SpecialCombo[]) => void;
  config: BlastGameConfig;
  t: (key: string) => string;
  effects: WordHandlerEffects;
  /** Multiplies baseScore before submission (e.g. combo2x pre-game buff). Defaults to 1. */
  scoreMultiplier?: number;
  /** Highlight recorder for capturing replay moments. Optional for backward compatibility. */
  recorder?: HighlightRecorder;
}

export function useBlastWordHandler({
  engine,
  sequencer,
  sounds,
  runCascade,
  lastPathRef,
  flyIdRef,
  explosionShakeTimerRef,
  nearMissTimerRef,
  onWordWithComboTypeRef,
  onComboDetected,
  config,
  t,
  effects,
  scoreMultiplier = 1,
  recorder,
}: UseBlastWordHandlerParams) {
  const handleWordAccepted = useCallback(async (data: { word: string; score: number }) => {
    if (lastPathRef.current.length === 0) return;

    const path = lastPathRef.current;
    lastPathRef.current = [];

    effects.setLastWordLength(path.length);
    effects.setWordSubmitCount(c => c + 1);

    const detectedCombos = detectSpecialCombos(path, engine.tileStates);
    const hadCombo = detectedCombos.length > 0;

    if (onWordWithComboTypeRef.current) {
      onWordWithComboTypeRef.current(data.word, hadCombo ? detectedCombos[0].type : null);
    }

    if (hadCombo && onComboDetected) {
      onComboDetected(detectedCombos);
    }

    effects.setWordFoundParticle(c => c + 1);

    // 1. Capture pre-grid snapshot before clearing
    const preGrid = structuredClone(engine.tileStates);

    // 1a. Animate word clear
    const clearedInfo = path.map(p => ({
      row: p.row,
      col: p.col,
      type: engine.tileStates[p.row]?.[p.col]?.type ?? 'standard',
    }));
    await sequencer.animateWordClear(clearedInfo);

    // 1b. Fire cleared tile events for PixiJS particle effects
    effects.setClearedTilesForEffects(clearedInfo.map(c => ({
      row: c.row, col: c.col, type: c.type as BlastTileType,
    })));

    // 2. Submit to engine — fold in the deterministic letter-value bonus (organic,
    // non-round totals; matches the server's MP total exactly), then apply the
    // pregame-buff score multiplier (combo2x).
    const scoreWithLetters = data.score + blastLetterBonus(data.word);
    const multipliedScore = scoreMultiplier !== 1 ? Math.round(scoreWithLetters * scoreMultiplier) : scoreWithLetters;
    const result = engine.submitWord(path, data.word, multipliedScore);

    // 2a. Capture post-grid snapshot after engine processing
    const postGrid = structuredClone(engine.tileStates);

    // 3. Score fly effect
    const avgRow = path.reduce((s, p) => s + p.row, 0) / path.length;
    const avgCol = path.reduce((s, p) => s + p.col, 0) / path.length;
    const flyId = `fly-${++flyIdRef.current}`;
    const tier: 1 | 2 | 3 = result.score >= 25 ? 3 : result.score >= 10 ? 2 : 1;
    // Single-pass dominant-type frequency count.
    let dominantTileType: string | undefined;
    let dominantCount = 0;
    const typeFreq = new Map<string, number>();
    for (const c of clearedInfo) {
      if (c.type === 'standard') continue;
      const next = (typeFreq.get(c.type) ?? 0) + 1;
      typeFreq.set(c.type, next);
      if (next > dominantCount) {
        dominantCount = next;
        dominantTileType = c.type;
      }
    }
    effects.setScoreFlyEvents(prev => [...prev.slice(-2), {
      id: flyId, score: result.score,
      startX: ((avgCol + 0.5) / config.gridSize) * 100,
      startY: ((avgRow + 0.5) / config.gridSize) * 100,
      tier,
      tileType: dominantTileType,
    }]);

    // 4. Combo flash effect
    if (hadCombo && detectedCombos[0]) {
      const mult = detectedCombos[0].scoreMultiplier;
      const flashTier: 1 | 2 | 3 = mult >= 6 ? 3 : mult >= 4 ? 2 : 1;
      effects.setComboFlash({ id: `flash-${flyIdRef.current}`, tier: flashTier });
      effects.setComboTypeName(t(`blast.combo.${detectedCombos[0].type}`) || `${detectedCombos[0].type.toUpperCase()}!`);
      sounds.playComboActivation(flashTier);
      effects.setComboParticle(c => c + 1);
    }

    // 5. Haptic + sound feedback
    const clearedTypes = new Set(clearedInfo.map(c => c.type));
    if (clearedTypes.has('bomb')) vibrateBlastBomb();
    else if (clearedTypes.has('lightning')) vibrateBlastLightning();
    else if (clearedTypes.has('prism')) vibrateBlastPrism();
    for (const type of clearedTypes) {
      if (type !== 'standard') sounds.playSpecialTileSound(type);
    }

    // 5b. Screen shake
    const hasBombExplosion = clearedTypes.has('bomb') || clearedTypes.has('countdown');
    const countdownExplosionCount = result.countdownExplosions?.length ?? 0;
    if (hasBombExplosion || countdownExplosionCount > 0) {
      const bombCount = clearedInfo.filter(c => c.type === 'bomb' || c.type === 'countdown').length + countdownExplosionCount;
      const intensity = Math.min(3, bombCount) as 1 | 2 | 3;
      const duration = 300 + intensity * 100;
      if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
      effects.setExplosionShake(intensity);
      explosionShakeTimerRef.current = setTimeout(() => effects.setExplosionShake(0), duration);
    }

    // 6. Near-miss detection
    const nearMiss = detectNearMiss(path, engine.grid!, engine.tileStates, config.gridSize, hadCombo);
    if (nearMiss) {
      effects.setNearMissCells(nearMiss.cells);
      if (nearMissTimerRef.current) clearTimeout(nearMissTimerRef.current);
      nearMissTimerRef.current = setTimeout(() => effects.setNearMissCells([]), 1200);
    }

    // 7. Cascade chain
    await runCascade(path.length);

    // 7a. Record word submission for highlight reel if recorder is available
    if (recorder) {
      const specialTilesInPath = clearedInfo
        .map(c => c.type as BlastTileType)
        .filter(t => t !== 'standard');
      recorder.recordWordSubmit({
        word: data.word,
        score: result.score,
        path: path.map(p => ({ row: p.row, col: p.col })),
        combo: detectedCombos.length,
        specialTilesHit: specialTilesInPath,
        preGrid,
        postGrid,
        effectsFired: result.explosions.map(e => e.type),
      });
    }

    sounds.playTileClear(clearedInfo.length);
    sounds.playLongWordBonus(path.length);

    // 8. Mascot reaction — fire after the cascade settles so HUD timing matches
    // the visual finale, not the initial pop. Decorative-only; failure here
    // must never break gameplay.
    try {
      emitMascotEvent({
        kind: 'word-submitted',
        wordLength: path.length,
        gemLetterUsed: hasGemLetter(data.word, config.language),
      });
    } catch {
      /* mascot is decorative — swallow */
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, runCascade, onComboDetected, sounds, sequencer, config.gridSize, t, scoreMultiplier]);

  return { handleWordAccepted };
}
