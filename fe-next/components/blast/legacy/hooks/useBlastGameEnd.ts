/**
 * useBlastGameEnd — extracted game-end detection + Sugar Crush from BlastGame.
 * SP: moves run out, board clears, or dead end.
 * MP: server timer controls end, but dead-end still triggers locally.
 */

import { useEffect, useRef, useState } from 'react';
import { planSugarCrush } from '../utils/blastSugarCrush';
import type { BlastResultsData, BlastTileState, BlastTileType } from '../types';
import type { WaveConfig } from '../utils/blastWaveConfig';

/** Shape we pass to the debris spawner for the dead-end finale burst. */
export interface DeadEndFinaleTile {
  row: number;
  col: number;
  type: BlastTileType;
}

interface GameEndDeps {
  engine: {
    gameState: {
      isComplete: boolean;
      isDeadEnd: boolean;
      score: number;
      wordsFound: string[];
      tilesCleared: number;
      totalTiles: number;
    };
    getResults: (maxCombo: number, wavesCompleted?: number, waveResults?: import('../types').WaveResult[], allObjectivesComplete?: boolean) => BlastResultsData;
    getLatestState: () => { tileStates: BlastTileState[][] };
    setTileStates: (fn: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
  };
  isMultiplayer: boolean;
  gridSize: number;
  waveConfig?: WaveConfig;
  objectives: { allObjectivesComplete: boolean };
  onGameEnd: (results: BlastResultsData) => void;
  /** MP only: called after Sugar Crush animation — signal server to end game early on dead-end. */
  onMPDeadEnd?: () => void;
  /** MP only: the shared board was fully cleared — fire a win-flavored local celebration before results. */
  onMPBoardCleared?: () => void;
  onWaveComplete?: (score: number, words: string[], clearPct: number) => void;
  /** Fires when board is cleared and highlight phase should start (SP only). */
  onHighlightStart?: (finalScore: number) => void;
  /** Fires after Sugar Crush with every non-cleared tile, so the view can trigger a finale debris burst. */
  onDeadEndFinale?: (tiles: DeadEndFinaleTile[]) => void;
  /** When true, a dead-end state will NOT kick off the Sugar Crush finale — caller is showing a continue offer. */
  deferDeadEndFinale?: boolean;
  maxCombo: number;
  sounds: {
    playSpecialTileSound: (type: string) => void;
  };
  setExplosionShake: (intensity: number) => void;
  explosionShakeTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  /** Highlight recorder for Blast Highlight Reel. Records game-end event before transitioning to highlight phase. */
  recorder?: import('@/lib/blast/highlightRecorder').HighlightRecorder;
}

/**
 * Manages game-end detection with Sugar Crush finale sequence.
 * Uses refs for callbacks to avoid stale closures without re-triggering the effect.
 */
export function useBlastGameEnd(deps: GameEndDeps) {
  const {
    engine, isMultiplayer, gridSize,
    objectives,
  } = deps;

  // Refs to avoid stale closures
  const depsRef = useRef(deps);
  useEffect(() => { depsRef.current = deps; }, [deps]);

  const sugarCrushRunningRef = useRef(false);
  const [sugarCrushActive, setSugarCrushActive] = useState(false);

  // IMPORTANT: Do NOT include `engine` in deps — Sugar Crush mutates tileStates which would
  // recreate the engine object, cancel the async loop via cleanup, and restart it infinitely.
  useEffect(() => {
    const { onGameEnd, onWaveComplete, onHighlightStart, maxCombo, sounds, setExplosionShake, explosionShakeTimerRef, recorder } = depsRef.current;

    // Board cleared in MP — the shared board is exhausted for everyone. Signal the
    // server to end the room (idempotent endGame) and fire the win-flavored celebration.
    // The plain `!isMultiplayer` block below never runs for MP, so without this the room
    // would sit idle until the timer expired even though the board was fully cleared.
    if (isMultiplayer && engine.gameState.isComplete) {
      depsRef.current.recorder?.recordEnd('cleared', engine.gameState.score);
      depsRef.current.onMPBoardCleared?.();
      depsRef.current.onMPDeadEnd?.();
      return undefined;
    }

    // Board cleared — all tiles gone (SP only)
    if (!isMultiplayer && engine.gameState.isComplete) {
      const { score, wordsFound, tilesCleared, totalTiles } = engine.gameState;
      const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;

      // Record game-end event in highlight recorder before transitioning to highlight phase
      recorder?.recordEnd('cleared', score);

      // Full board clear always advances the wave — secondary objectives
      // (collect_type, word_length, score_target) affect stars, not progression.
      if (onWaveComplete) {
        const timer = setTimeout(() => onWaveComplete(score, wordsFound, clearPct), 2000);
        return () => clearTimeout(timer);
      }

      // Route through highlight phase if a callback is provided; otherwise fall back to direct game-end
      if (onHighlightStart) {
        const timer = setTimeout(() => onHighlightStart(score), 2000);
        return () => clearTimeout(timer);
      }

      const results = engine.getResults(maxCombo, undefined, undefined, objectives.allObjectivesComplete);
      const timer = setTimeout(() => onGameEnd(results), 2000);
      return () => clearTimeout(timer);
    }

    // Dead end — run Sugar Crush finale, then end game.
    // If caller is offering a continue, defer the finale until they decline or the revive clears isDeadEnd.
    if (engine.gameState.isDeadEnd && !depsRef.current.deferDeadEndFinale) {
      if (sugarCrushRunningRef.current) return undefined;
      sugarCrushRunningRef.current = true;
      setSugarCrushActive(true);

      // Record dead-end in highlight recorder (no highlight reel for losses)
      const { recorder } = depsRef.current;
      recorder?.recordEnd('deadEnd', engine.gameState.score);

      let cancelled = false;

      (async () => {
        const tiles = engine.getLatestState().tileStates;
        const steps = planSugarCrush(tiles, gridSize);

        if (steps.length > 0) {
          for (let i = 0; i < steps.length; i++) {
            if (cancelled) return;
            const step = steps[i];
            const delay = i === 0 ? step.delayMs : step.delayMs - steps[i - 1].delayMs;
            await new Promise<void>(r => setTimeout(r, delay));
            if (cancelled) return;

            engine.setTileStates(prev => prev.map((row, ri) =>
              row.map((tile, ci) => {
                if (ri === step.row && ci === step.col) {
                  return { ...tile, type: step.convertTo, hitsRemaining: 1, activationEffect: 'sugar-crush' };
                }
                return tile;
              }),
            ));

            sounds.playSpecialTileSound(step.convertTo);
            if (step.intensity === 'high' || step.convertTo === 'bomb') {
              if (explosionShakeTimerRef.current) clearTimeout(explosionShakeTimerRef.current);
              setExplosionShake(step.convertTo === 'bomb' ? 3 : 2);
              explosionShakeTimerRef.current = setTimeout(() => setExplosionShake(0), 500);
            }
          }

          if (!cancelled) await new Promise<void>(r => setTimeout(r, 500));
        }

        if (cancelled) return;

        // Finale burst: flag all remaining tiles for a debris/shockwave explosion
        // before the game-end transition unmounts the canvas.
        const latestDeps = depsRef.current;
        if (latestDeps.onDeadEndFinale) {
          const finalTiles = engine.getLatestState().tileStates;
          const remaining: DeadEndFinaleTile[] = [];
          for (let r = 0; r < finalTiles.length; r++) {
            const row = finalTiles[r];
            for (let c = 0; c < row.length; c++) {
              const tile = row[c];
              if (tile && !tile.isCleared) {
                remaining.push({ row: r, col: c, type: tile.type });
              }
            }
          }
          if (remaining.length > 0) {
            latestDeps.onDeadEndFinale(remaining);
            // Give debris time to render + physics to fling before phase transition.
            await new Promise<void>(r => setTimeout(r, 1400));
            if (cancelled) return;
          }
        }

        setSugarCrushActive(false);

        // End game — read latest deps
        const { score, wordsFound, totalTiles } = engine.gameState;

        // clearPct reflects only what the player actually cleared through gameplay.
        // The finale visually explodes remaining tiles as debris but those don't
        // count toward the player's clear percentage.
        const tilesCleared = engine.gameState.tilesCleared;
        const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;

        // In MP, signal the server to end the game — Sugar Crush played for visual clarity,
        // but results come from the server, not the client engine.
        if (isMultiplayer) {
          latestDeps.onMPDeadEnd?.();
          return;
        }

        // Advance the wave if the primary board-clear objective (90%+) is met.
        // Secondary objectives affect stars but don't block progression.
        if (latestDeps.onWaveComplete && clearPct >= 90) {
          latestDeps.onWaveComplete(score, wordsFound, clearPct);
        } else {
          const results = engine.getResults(
            latestDeps.maxCombo,
            undefined,
            undefined,
            objectives.allObjectivesComplete,
          );
          latestDeps.onGameEnd(results);
        }
      })();

      return () => { cancelled = true; };
    }

    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- engine excluded: Sugar Crush mutates tileStates
  }, [
    engine.gameState.isComplete,
    engine.gameState.isDeadEnd,
    deps.deferDeadEndFinale,
    objectives.allObjectivesComplete,
    isMultiplayer,
    gridSize,
  ]);

  return { sugarCrushActive };
}
