'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useGameRewards } from '@/hooks/useGameRewards';
import { wordHuntSolveTier } from '@/shared/utils/wordHuntScoring';
import type { WordHuntEffect } from '../WordHuntEffectsCanvas';
import type { SurvivalGameState } from './useSurvivalGameLogic';
import { LIFE_DRAIN_RATE } from './constants';
import { hapticError, hapticWordAccepted } from '@/utils/haptics';

const LOW_LIFE = 25;

/** The per-second drain is shown by the life bar; only a penalty gets the screen shock. */
export function isPenaltyDrop(drop: number): boolean {
  return drop > LIFE_DRAIN_RATE;
}

/**
 * `skipAnimations` drops the heavy layers (Pixi particles, confetti) on a device
 * that cannot afford them. `calm` is motion the player asked to stop. A slow phone
 * keeps the light layer, the screen flash and a buzz per verdict, so a word still
 * lands like it does on desktop instead of going quiet.
 */
export function useWordHuntFx(state: SurvivalGameState, skipAnimations: boolean, calm: boolean = skipAnimations) {
  const { variant: clueShakeVariant, trackExposure: trackClueShakeExposure } =
    useExperiment('exp-wordhunt-clue-shake-v1');
  const [shakingClues, setShakingClues] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(shakeTimer.current), []);
  const { rewardId, triggerReward } = useGameRewards();
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [flashColor, setFlashColor] = useState('bg-neo-lime/15');

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pixiEffects, setPixiEffects] = useState<WordHuntEffect[]>([]);
  const pushEffect = useCallback((effect: WordHuntEffect) => {
    setPixiEffects((prev) => [...prev, effect]);
  }, []);
  const handleEffectsConsumed = useCallback(() => setPixiEffects([]), []);

  useEffect(() => {
    if (skipAnimations) return;
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [skipAnimations]);

  const lastSeqRef = useRef(state.feedbackSeq);
  useEffect(() => {
    if (state.feedbackSeq === lastSeqRef.current) return;
    lastSeqRef.current = state.feedbackSeq;
    const type = state.feedbackType;
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const flash = (color: string) => {
      if (calm) return;
      setFlashColor(color);
      setFlashTrigger((n) => n + 1);
    };
    if (type === 'valid-word') {
      hapticWordAccepted();
      flash('bg-neo-lime/15');
      if (skipAnimations) return;
      triggerReward('wordFound');
      pushEffect({ type: 'wordValid', x: cx, y: cy, points: state.lastScoreIncrement ?? 1 });
    } else if (type === 'target-found') {
      hapticWordAccepted();
      const tier = wordHuntSolveTier(state.attempts.filter((a) => !a.isDiscovery).length);
      flash(tier.tier <= 1 ? 'bg-neo-yellow/30' : 'bg-neo-lime/20');
      if (skipAnimations) return;
      triggerReward('levelUp');
      pushEffect({ type: 'targetFound', x: cx, y: cy });
    } else if (type === 'invalid-word' || type === 'not-in-dictionary' || type === 'not-on-board') {
      hapticError();
      // Desktop gets a red flash from the particle layer; without it, flash in CSS.
      if (skipAnimations) flash('bg-neo-red/15');
      else pushEffect({ type: 'invalid', x: cx, y: cy });
      trackGrowthEvent('wordhunt_invalid_submitted', { feedbackType: type });
      trackClueShakeExposure();
      if (clueShakeVariant === 'clue-shake') {
        setShakingClues(true);
        clearTimeout(shakeTimer.current);
        shakeTimer.current = setTimeout(() => setShakingClues(false), 500);
      }
    }
  }, [
    state.feedbackSeq,
    state.feedbackType,
    state.lastScoreIncrement,
    state.attempts,
    triggerReward,
    skipAnimations,
    calm,
    pushEffect,
    canvasSize.width,
    canvasSize.height,
    clueShakeVariant,
    trackClueShakeExposure,
  ]);

  const prevLifeRef = useRef(state.lifePoints);
  const lowLifeFiredRef = useRef(false);
  useEffect(() => {
    const prev = prevLifeRef.current;
    const curr = state.lifePoints;
    prevLifeRef.current = curr;
    if (skipAnimations) return;
    if (curr > prev) pushEffect({ type: 'lifeGain', amount: curr - prev });
    else if (isPenaltyDrop(prev - curr)) pushEffect({ type: 'lifeDrop', amount: prev - curr });
    if (curr > 0 && curr <= LOW_LIFE && !lowLifeFiredRef.current) {
      pushEffect({ type: 'lowLife' });
      lowLifeFiredRef.current = true;
    } else if (curr > LOW_LIFE && lowLifeFiredRef.current) {
      lowLifeFiredRef.current = false;
    }
  }, [state.lifePoints, skipAnimations, pushEffect]);

  const prevEliminatedRef = useRef(state.eliminatedLetters.size);
  useEffect(() => {
    const prev = prevEliminatedRef.current;
    const curr = state.eliminatedLetters.size;
    prevEliminatedRef.current = curr;
    if (!skipAnimations && curr > prev) {
      pushEffect({ type: 'letterEliminated', x: canvasSize.width / 2, y: canvasSize.height * 0.6 });
    }
  }, [state.eliminatedLetters.size, skipAnimations, pushEffect, canvasSize.width, canvasSize.height]);

  const prevClueGainingRef = useRef(state.isClueGaining);
  useEffect(() => {
    if (!skipAnimations && state.isClueGaining && !prevClueGainingRef.current) pushEffect({ type: 'clueGain' });
    prevClueGainingRef.current = state.isClueGaining;
  }, [state.isClueGaining, skipAnimations, pushEffect]);

  const gameEndFiredRef = useRef<'won' | 'lost' | null>(null);
  useEffect(() => {
    if (skipAnimations) return;
    if (state.hasWon && gameEndFiredRef.current !== 'won') {
      pushEffect({ type: 'gameWon', score: state.liveScore });
      gameEndFiredRef.current = 'won';
    } else if (state.isGameOver && !state.hasWon && gameEndFiredRef.current !== 'lost') {
      pushEffect({ type: 'gameLost' });
      gameEndFiredRef.current = 'lost';
    }
  }, [state.hasWon, state.isGameOver, state.liveScore, skipAnimations, pushEffect]);

  return {
    containerRef,
    canvasSize,
    pixiEffects,
    handleEffectsConsumed,
    flashTrigger,
    flashColor,
    rewardId,
    shakingClues,
  };
}
