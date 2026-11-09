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
import { selectCascadeFinds } from '../utils/blastCascadeQuality';
import { diffClearedTiles } from '../utils/diffClearedTiles';
import type { ClearedTileEvent } from '../BlastEffectsCanvas';
import type { ScoreFlyEvent } from '../BlastScoreFly';
import type { UseBlastComboStreakReturn } from './useBlastComboStreak';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { emitGemsCollected, gemEventsFrom } from '@/lib/blast/gemCollectBus';
import { detectVerticalWords, detectHorizontalWords } from '../utils/blastVerticalScanner';
import { detectMatch3Clusters } from '../utils/blastMatch3Detector';
import { vibrateBlastCascade } from '@/components/grid/hapticFeedback';

interface CascadeDeps {
  engine: {
    startCascade: () => CascadeResult;
    stopCascade: () => void;
    submitWord: (cells: Array<{ row: number; col: number }>, word: string, score: number, opts?: { cascadeCluster?: boolean }) => WordSubmitResult;
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
  /** Feeds cascade-cleared tiles to the PixiJS FX layer (shatter/debris). */
  setClearedTilesForEffects: (tiles: ClearedTileEvent[]) => void;
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
      setScoreFlyEvents, setComboFlash, flyIdRef, setClearedTilesForEffects,
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

        type CascadeFind = { cells: Array<{ row: number; col: number }>; label: string; isCluster: boolean; bonusFn: (cl: number) => number };
        const cascadeFinds: CascadeFind[] = [];

        // 1. Match-3 clusters
        const allClusters = detectMatch3Clusters(grid, latestTiles, affectedCols);
        for (const cluster of allClusters) {
          cascadeFinds.push({
            cells: cluster.cells,
            label: `[${cluster.letter}×${cluster.cells.length}]`,
            isCluster: true,
            bonusFn: (cl) => Math.round(cluster.cells.length * 3 * cascadeBonusMult * cl),
          });
        }

        // 2. Vertical auto-words
        const vertWords = detectVerticalWords(grid, latestTiles, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedCols);
        for (const vw of vertWords) {
          cascadeFinds.push({
            cells: vw.path,
            label: vw.word,
            isCluster: false,
            bonusFn: (cl) => Math.round(vw.word.length * vw.word.length * cascadeBonusMult * cl),
          });
        }

        // 3. Horizontal auto-words
        const horizWords = detectHorizontalWords(grid, latestTiles, checkWord, foundWordsSet, CASCADE_MIN_WORD_LENGTH, affectedRows);
        for (const hw of horizWords) {
          cascadeFinds.push({
            cells: hw.path,
            label: hw.word,
            isCluster: false,
            bonusFn: (cl) => Math.round(hw.word.length * hw.word.length * cascadeBonusMult * cl),
          });
        }

        // One quality-gated find per chain level — cascades celebrate a single
        // best match instead of triple-clearing, and deep chains need quality.
        const picked = selectCascadeFinds(cascadeFinds, chainLevel + 1);
        if (picked.length === 0) break;
        cascadeFinds.length = 0;
        cascadeFinds.push(...picked);

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

        // Pop the found cells with the same clear animation as a played word, and fire
        // the FX/sound on its first frame, so shatter, sound and tile pop land together.
        const findCells = cascadeFinds.flatMap(f => f.cells);
        const findTiles = engine.getLatestState().tileStates;
        const findInfo = findCells.map(c => ({ row: c.row, col: c.col, type: findTiles[c.row]?.[c.col]?.type ?? 'standard' }));
        let popped = false;
        const pop = () => {
          if (popped) return;
          popped = true;
          setClearedTilesForEffects(findInfo.map(c => ({ row: c.row, col: c.col, type: c.type })));
          emitGemsCollected(gemEventsFrom(findInfo, findTiles));
          sounds.playCascadeChain(chainLevel);
        };
        await sequencer.animateWordClear(findInfo, pop);
        pop();

        // Bomb/gem neighbours caught by these finds were not popped above; they burst now.
        const preCascade = structuredClone(engine.getLatestState().tileStates);
        let creditedBonus = 0;
        for (const find of cascadeFinds) {
          const bonus = find.bonusFn(chainLevel);
          creditedBonus += bonus;
          if (find.isCluster) engine.submitWord(find.cells, find.label, bonus, { cascadeCluster: true });
          else engine.submitWord(find.cells, find.label, bonus);
          foundWordsSet.add(find.label);
        }
        const findKeys = new Set(findCells.map(c => `${c.row},${c.col}`));
        const extraCleared = diffClearedTiles(preCascade, engine.getLatestState().tileStates)
          .filter(c => !findKeys.has(`${c.row},${c.col}`));
        if (extraCleared.length > 0) {
          setClearedTilesForEffects(extraCleared.map(c => ({ row: c.row, col: c.col, type: c.type })));
          emitGemsCollected(gemEventsFrom(extraCleared, preCascade));
        }

        // Cascade chain sound + score fly
        const chainFlyId = `chain-${++flyIdRef.current}`;
        const chainTier: 1 | 2 | 3 = chainLevel >= 3 ? 3 : chainLevel >= 2 ? 2 : 1;
        // Fly the bonus the engine ACTUALLY credited — the old `chainLevel * 5`
        // token understated deep chains ~5-10× (a 5-letter chain-2 find credits
        // ~38pts but flew "+10"), hiding the cascade payoff from the player.
        const chainBonus = creditedBonus;
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
