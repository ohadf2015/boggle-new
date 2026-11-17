'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useGameRewards } from '@/hooks/useGameRewards';
import type { WordHuntEffect } from '../WordHuntEffectsCanvas';
import type { SurvivalGameState } from './useSurvivalGameLogic';
import { LIFE_DRAIN_RATE } from './constants';
import { hapticError, hapticWordAccepted } from '@/utils/haptics';

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
    } else if (type === 'invalid-word' || type === 'not-in-dictionary' || type === 'not-on-board') {
      // A miss only buzzes: red flashes and shakes read as punishment.
      hapticError();
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
  useEffect(() => {
    const prev = prevLifeRef.current;
    const curr = state.lifePoints;
    prevLifeRef.current = curr;
    if (skipAnimations) return;
    if (curr > prev) pushEffect({ type: 'lifeGain', amount: curr - prev });
    else if (isPenaltyDrop(prev - curr)) pushEffect({ type: 'lifeDrop', amount: prev - curr });
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

  // A win's one burst is the finish overlay's confetti; only a loss gets a canvas beat.
  const lossFiredRef = useRef(false);
  useEffect(() => {
    if (skipAnimations || lossFiredRef.current || !state.isGameOver || state.hasWon) return;
    pushEffect({ type: 'gameLost' });
    lossFiredRef.current = true;
  }, [state.hasWon, state.isGameOver, skipAnimations, pushEffect]);

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
