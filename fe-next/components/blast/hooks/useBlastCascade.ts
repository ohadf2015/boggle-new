/**
 * useBlastCascade — extracted cascade chain logic from BlastGame.
 * Handles multi-chain cascades: gravity → match-3/vertical/horizontal word detection → chain bonuses.
 */

import { useCallback, useRef } from 'react';
import type { UseBlastSequencerReturn } from './useBlastSequencer';
import type { CascadeResult, WordSubmitResult } from './useBlastEngine';
import {
  type BlastTileState,
  MAX_CASCADE_CHAIN,
  CASCADE_MIN_WORD_LENGTH,
  MAX_CASCADE_WORDS_PER_LEVEL,
  CASCADE_CHAIN_BONUS_MULTIPLIER,
  CASCADE_MOMENTUM_THRESHOLDS,
  CASCADE_MOMENTUM_PER_WORD,
  CASCADE_MOMENTUM_LONG_WORD_BONUS,
  CASCADE_MOMENTUM_DECAY,
  CASCADE_TIER_MAX_CHAIN,
  CASCADE_HIGHLIGHT_DURATION,
  CASCADE_HIGHLIGHT_LINGER,
} from '../types';
import type { WaveConfig } from '../utils/blastWaveConfig';
import type { ScoreFlyEvent } from '../BlastScoreFly';
import type { UseBlastComboStreakReturn } from './useBlastComboStreak';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { detectVerticalWords, detectHorizontalWords } from '../utils/blastVerticalScanner';
import { detectMatch3Clusters } from '../utils/blastMatch3Detector';
import { vibrateBlastCascade } from '@/components/grid/hapticFeedback';

interface CascadeDeps {
  engine: {
    startCascade: () => CascadeResult;
    stopCascade: () => void;
    submitWord: (cells: Array<{ row: number; col: number }>, word: string, score: number) => WordSubmitResult;
    getLatestState: () => { grid: string[][] | null; tileStates: BlastTileState[][] };
    gameState: { wordsFound: string[] };
  };
  sequencer: UseBlastSequencerReturn;
  sounds: {
    playCascadeChain: (level: number) => void;
  };
  comboStreak: UseBlastComboStreakReturn;
  checkWord: (word: string) => boolean;
  waveConfig?: WaveConfig;
  setCascadeHighlightCells: (cells: Array<{ row: number; col: number }>) => void;
  setCascadeHighlightWord: (word: string | null) => void;
  setScoreFlyEvents: React.Dispatch<React.SetStateAction<ScoreFlyEvent[]>>;
  setComboFlash: (flash: { id: string; tier: 1 | 2 | 3 } | null) => void;
  flyIdRef: React.RefObject<number>;
}

export function useBlastCascade(deps: CascadeDeps) {
  const cascadeMomentumRef = useRef(0);

  const runCascade = useCallback(async (pathLength: number) => {
    const {
      engine, sequencer, sounds, comboStreak, checkWord, waveConfig,
      setCascadeHighlightCells, setCascadeHighlightWord,
      setScoreFlyEvents, setComboFlash, flyIdRef,
    } = deps;

    // Build cascade momentum
    cascadeMomentumRef.current += CASCADE_MOMENTUM_PER_WORD + (pathLength >= 5 ? CASCADE_MOMENTUM_LONG_WORD_BONUS : 0);

    // Determine momentum tier → max chain depth
    let momentumTier = 0;
    for (let i = CASCADE_MOMENTUM_THRESHOLDS.length - 1; i >= 0; i--) {
      if (cascadeMomentumRef.current >= CASCADE_MOMENTUM_THRESHOLDS[i]) {
        momentumTier = i;
        break;
      }
    }
    const maxChainForMomentum = CASCADE_TIER_MAX_CHAIN[momentumTier] ?? 1;

    // Pause combo timer so cascades don't penalise the player's streak
    comboStreak.pauseTimer();
    let chainLevel = 0;

    try {
      let cascadeResult = engine.startCascade();
      await sequencer.animateCascade(cascadeResult.gravity, chainLevel, () => cascadeResult.commit?.());

      // Chain cascades
      const cascadeBonusMult = waveConfig?.cascadeChainBonus ?? CASCADE_CHAIN_BONUS_MULTIPLIER;
      const foundWordsSet = new Set(engine.gameState.wordsFound);
      const effectiveMaxChain = Math.min(MAX_CASCADE_CHAIN, maxChainForMomentum);

      while (chainLevel < effectiveMaxChain) {
        const affectedCols = new Set<number>(cascadeResult.gravity.newTiles.map((t) => t.col));
        const affectedRows = new Set<number>(cascadeResult.gravity.newTiles.map((t) => t.row));
        for (const ft of cascadeResult.gravity.fallingTiles) {
          affectedRows.add(ft.row);
          affectedCols.add(ft.col);
        }

        const { grid, tileStates: latestTiles } = engine.getLatestState();
        if (!grid) break;

        type CascadeFind = { cells: Array<{ row: number; col: number }>; label: string; bonusFn: (cl: number) => number };
        const cascadeFinds: CascadeFind[] = [];

        // 1. Match-3 clusters
        const allClusters = detectMatch3Clusters(grid, latestTiles, affectedCols);
        for (const cluster of allClusters.slice(0, MAX_CASCADE_WORDS_PER_LEVEL)) {
          cascadeFinds.push({
            cells: cluster.cells,
            label: `[${cluster.letter}×${cluster.cells.length}]`,
            bonusFn: (cl) => Math.round(cluster.cells.length * 3 * cascadeBonusMult * cl),
          });
        }

        // 2. Vertical auto-words
        const vertWords = detectVerticalWords(grid, latestTiles, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedCols);
        for (const vw of vertWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL)) {
          cascadeFinds.push({
            cells: vw.path,
            label: vw.word,
            bonusFn: (cl) => Math.round(vw.word.length * vw.word.length * cascadeBonusMult * cl),
          });
        }

        // 3. Horizontal auto-words
        const horizWords = detectHorizontalWords(grid, latestTiles, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedRows);
        for (const hw of horizWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL)) {
          cascadeFinds.push({
            cells: hw.path,
            label: hw.word,
            bonusFn: (cl) => Math.round(hw.word.length * hw.word.length * cascadeBonusMult * cl),
          });
        }

        if (cascadeFinds.length === 0) break;
        // Cap total finds per level to 2 (match-3 + one word) — prevents 3
        // simultaneous detectors from wiping half the board in a single chain step.
        cascadeFinds.splice(2);

        chainLevel++;

        // Highlight phase
        const allHighlightCells = cascadeFinds.flatMap(f => f.cells);
        const firstWordLabel = cascadeFinds[0].label;
        setCascadeHighlightCells(allHighlightCells);
        setCascadeHighlightWord(firstWordLabel.startsWith('[') ? firstWordLabel : firstWordLabel.toUpperCase());
        await new Promise<void>(r => setTimeout(r, CASCADE_HIGHLIGHT_DURATION));
        setCascadeHighlightWord(null);
        await new Promise<void>(r => setTimeout(r, CASCADE_HIGHLIGHT_LINGER));
        setCascadeHighlightCells([]);

        // Submit all finds
        for (const find of cascadeFinds) {
          const bonus = find.bonusFn(chainLevel);
          engine.submitWord(find.cells, find.label, bonus);
          foundWordsSet.add(find.label);
        }

        // Cascade chain sound + score fly
        sounds.playCascadeChain(chainLevel);
        const chainFlyId = `chain-${++flyIdRef.current}`;
        const chainTier: 1 | 2 | 3 = chainLevel >= 3 ? 3 : chainLevel >= 2 ? 2 : 1;
        const chainBonus = chainLevel * 5;
        setScoreFlyEvents(prev => [...prev.slice(-3), {
          id: chainFlyId, score: chainBonus,
          startX: 50, startY: 50,
          tier: chainTier,
        }]);

        // Chain combo flash + haptic
        if (chainLevel >= 2) {
          setComboFlash({ id: `chain-flash-${flyIdRef.current}`, tier: chainTier });
          vibrateBlastCascade();
        }

        // Run gravity for this chain level
        cascadeResult = engine.startCascade();
        await sequencer.animateCascade(cascadeResult.gravity, chainLevel, () => cascadeResult.commit?.());
      }
    } finally {
      engine.stopCascade();
    }

    // Decay momentum if no cascade triggered
    if (chainLevel === 0) {
      cascadeMomentumRef.current = Math.max(0, cascadeMomentumRef.current - CASCADE_MOMENTUM_DECAY);
    }

    // Resume combo timer after cascades complete
    comboStreak.resumeTimer();
    comboStreak.onWordSubmitted();

    // Decorative mascot reaction — fire after cascade settles, only on
    // chains worth celebrating (>=3). Never block on this.
    if (chainLevel >= 3) {
      try {
        emitMascotEvent({ kind: 'cascade-detected', chainDepth: chainLevel });
      } catch {
        /* decorative — swallow */
      }
    }

    return chainLevel;
   
  }, [deps]);

  return { runCascade, cascadeMomentumRef };
}
