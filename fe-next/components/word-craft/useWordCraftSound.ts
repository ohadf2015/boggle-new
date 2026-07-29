'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import {
  commitSoundKeys,
  captureSound,
  heatBeatSound,
  gameOverSound,
  type GameOverResult,
} from '@/lib/word-craft/celebration/soundPlan';
import { resolveCommitTier, type CommitContext } from '@/lib/word-craft/celebration/commitTier';
import {
  classifyHeat,
  detectHeatTransition,
  type HeatState,
} from '@/lib/word-craft/celebration/heatTransition';

/**
 * Slice of WordCraft reducer state this hook needs to drive audio. Kept flat
 * (primitives) so the component passes only what changed and effects re-run
 * tightly.
 */
export interface WordCraftSoundState {
  heat: number;
  overdrive: boolean;
  burnout: boolean;
  /** lastCapture.turnIndex — changes when a fresh capture lands. */
  captureTurnIndex: number | null;
  /** number of cells flipped in that capture. */
  captureCount: number;
  /** game.state.turn === 'over' */
  isOver: boolean;
  /** win/lose/draw, resolved by the caller from final scores. */
  result: GameOverResult | null;
}

/**
 * Owns ALL WordCraft sound lifecycle so PageClient stays lean (it only calls
 * `playCommit` at the commit site). On mount it activates the SFX gate +
 * starts in-game music; effects fire heat-beat / capture / game-over sounds as
 * state transitions; unmount tears audio down.
 */
export function useWordCraftSound(state: WordCraftSoundState, cosyMode: boolean) {
  const { playSound, setGameActive } = useSoundEffects();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();

  // --- lifecycle: activate audio + music on mount, tear down on unmount ----
  useEffect(() => {
    setGameActive(true);
    fadeToTrack(TRACKS.IN_GAME, 600, 600);
    return () => {
      setGameActive(false);
      stopMusic(500);
    };
    // mount/unmount only — context fns are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- heat state-machine beats -------------------------------------------
  const prevHeat = useRef<HeatState>(
    classifyHeat({ heat: state.heat, overdrive: state.overdrive, burnout: state.burnout }),
  );
  useEffect(() => {
    const cur = classifyHeat({ heat: state.heat, overdrive: state.overdrive, burnout: state.burnout });
    const beat = detectHeatTransition(prevHeat.current, cur);
    prevHeat.current = cur;
    if (!beat) return;
    const key = heatBeatSound(beat);
    if (key) playSound(key, {});
  }, [state.heat, state.overdrive, state.burnout, playSound]);

  // --- territory capture reward -------------------------------------------
  const lastCaptureRef = useRef<number | null>(state.captureTurnIndex);
  useEffect(() => {
    if (state.captureTurnIndex == null) return;
    if (state.captureTurnIndex === lastCaptureRef.current) return;
    lastCaptureRef.current = state.captureTurnIndex;
    const key = captureSound(state.captureCount);
    if (key) playSound(key, {});
  }, [state.captureTurnIndex, state.captureCount, playSound]);

  // --- game over ----------------------------------------------------------
  const playedOverRef = useRef(false);
  useEffect(() => {
    if (!state.isOver) {
      playedOverRef.current = false;
      return;
    }
    if (playedOverRef.current) return;
    playedOverRef.current = true;
    playSound(gameOverSound(state.result ?? 'draw'), { requiresGameActive: false });
    stopMusic(500);
  }, [state.isOver, state.result, playSound, stopMusic]);

  // --- per-commit celebration sound ---------------------------------------
  // Accepts the same CommitContext PageClient already builds for the Pixi
  // spectacle so the call site stays a one-liner; tier is resolved here.
  const playCommit = useCallback(
    (ctx: CommitContext) => {
      const tier = resolveCommitTier(ctx);
      for (const key of commitSoundKeys(tier, ctx.hasRareTile, cosyMode)) {
        playSound(key, {});
      }
    },
    [cosyMode, playSound],
  );

  // --- discrete feedback for moments that were silent before --------------
  const playOpponentScored = useCallback(() => playSound('opponentScored', {}), [playSound]);
  const playPass = useCallback(() => playSound('menuClose', {}), [playSound]);
  const playSwap = useCallback(() => playSound('boardShuffle', {}), [playSound]);
  const playNewBest = useCallback(
    () => playSound('achievement', { requiresGameActive: false }),
    [playSound],
  );
  // Pass-and-play device hand-off — the curtain was silent.
  const playHandoff = useCallback(
    () => playSound('swipeTransition', { requiresGameActive: false }),
    [playSound],
  );

  return { playCommit, playOpponentScored, playPass, playSwap, playNewBest, playHandoff };
}
