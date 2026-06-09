'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  shouldShowGuidance,
  markGuidanceShown,
  type GuidanceState,
} from '../utils/contextualGuidanceStorage';

interface UseContextualGuidanceReturn {
  // Visibility states
  showComboTip: boolean;
  showEarthquakeTip: boolean;
  showFireRoundTip: boolean;
  showSwipeTip: boolean;

  // Dismiss functions
  dismissComboTip: () => void;
  dismissEarthquakeTip: () => void;
  dismissFireRoundTip: () => void;
  dismissSwipeTip: () => void;

  // Trigger functions (call when event occurs)
  triggerComboGuidance: () => void;
  triggerEarthquakeGuidance: () => void;
  triggerFireRoundGuidance: () => void;
  triggerSwipeTipGuidance: () => void;
}

/**
 * useContextualGuidance - Hook to manage in-game guidance tooltips
 *
 * Shows guidance tooltips only on first occurrence of:
 * - Combo level >= 2
 * - Earthquake warning
 * - Fire round activation
 *
 * State is persisted in localStorage to show each tooltip only once per user.
 */
export function useContextualGuidance(): UseContextualGuidanceReturn {
  const [showComboTip, setShowComboTip] = useState(false);
  const [showEarthquakeTip, setShowEarthquakeTip] = useState(false);
  const [showFireRoundTip, setShowFireRoundTip] = useState(false);
  const [showSwipeTip, setShowSwipeTip] = useState(false);

  // Track if we've already triggered during this session to prevent re-triggers
  const triggeredRef = useRef<Record<keyof GuidanceState, boolean>>({
    comboShown: false,
    earthquakeShown: false,
    fireRoundShown: false,
    directionPatternShown: false,
    swipeTipShown: false,
    effectsPreferenceShown: false,
    dragTutorialShown: false,
    firstPlayTutorialCompleted: false,
    multiplayerTutorialShown: false,
    stuckCoachShown: false,
  });

  // Trigger combo guidance - called when combo reaches 2 or higher
  const triggerComboGuidance = useCallback(() => {
    // Only trigger once per session and only if not shown before
    if (triggeredRef.current.comboShown) return;

    if (shouldShowGuidance('comboShown')) {
      triggeredRef.current.comboShown = true;
      markGuidanceShown('comboShown');
      setShowComboTip(true);
    }
  }, []);

  // Trigger earthquake guidance - called when earthquake warning appears
  const triggerEarthquakeGuidance = useCallback(() => {
    if (triggeredRef.current.earthquakeShown) return;

    if (shouldShowGuidance('earthquakeShown')) {
      triggeredRef.current.earthquakeShown = true;
      markGuidanceShown('earthquakeShown');
      setShowEarthquakeTip(true);
    }
  }, []);

  // Trigger fire round guidance - called when fire round activates
  const triggerFireRoundGuidance = useCallback(() => {
    if (triggeredRef.current.fireRoundShown) return;

    if (shouldShowGuidance('fireRoundShown')) {
      triggeredRef.current.fireRoundShown = true;
      markGuidanceShown('fireRoundShown');
      setShowFireRoundTip(true);
    }
  }, []);

  // Trigger swipe tip guidance - called when player hasn't submitted words after delay
  const triggerSwipeTipGuidance = useCallback(() => {
    if (triggeredRef.current.swipeTipShown) return;

    if (shouldShowGuidance('swipeTipShown')) {
      triggeredRef.current.swipeTipShown = true;
      markGuidanceShown('swipeTipShown');
      setShowSwipeTip(true);
    }
  }, []);

  // Dismiss functions
  const dismissComboTip = useCallback(() => {
    setShowComboTip(false);
  }, []);

  const dismissEarthquakeTip = useCallback(() => {
    setShowEarthquakeTip(false);
  }, []);

  const dismissFireRoundTip = useCallback(() => {
    setShowFireRoundTip(false);
  }, []);

  const dismissSwipeTip = useCallback(() => {
    setShowSwipeTip(false);
  }, []);

  return {
    showComboTip,
    showEarthquakeTip,
    showFireRoundTip,
    showSwipeTip,
    dismissComboTip,
    dismissEarthquakeTip,
    dismissFireRoundTip,
    dismissSwipeTip,
    triggerComboGuidance,
    triggerEarthquakeGuidance,
    triggerFireRoundGuidance,
    triggerSwipeTipGuidance,
  };
}

/**
 * useComboGuidanceTrigger - Convenience hook that auto-triggers on combo level change
 * Pass the current combo level and it will trigger guidance when appropriate
 */
export function useComboGuidanceTrigger(
  comboLevel: number,
  triggerGuidance: () => void
): void {
  const prevComboRef = useRef(comboLevel);

  useEffect(() => {
    // Trigger when combo reaches 2 for the first time this game
    if (comboLevel >= 2 && prevComboRef.current < 2) {
      triggerGuidance();
    }
    prevComboRef.current = comboLevel;
  }, [comboLevel, triggerGuidance]);
}

/**
 * useEarthquakeGuidanceTrigger - Convenience hook that auto-triggers on earthquake state
 */
export function useEarthquakeGuidanceTrigger(
  earthquakeState: string | null | undefined,
  triggerGuidance: () => void
): void {
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (earthquakeState === 'warning' && !triggeredRef.current) {
      triggeredRef.current = true;
      triggerGuidance();
    }
  }, [earthquakeState, triggerGuidance]);
}

/**
 * useFireRoundGuidanceTrigger - Convenience hook that auto-triggers on fire round
 */
export function useFireRoundGuidanceTrigger(
  isFireRoundActive: boolean,
  triggerGuidance: () => void
): void {
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (isFireRoundActive && !triggeredRef.current) {
      triggeredRef.current = true;
      triggerGuidance();
    }
  }, [isFireRoundActive, triggerGuidance]);
}

/**
 * useSwipeTipGuidanceTrigger - Auto-triggers swipe tip when player hasn't submitted words
 * Shows after delaySeconds if wordCount is still 0
 */
export function useSwipeTipGuidanceTrigger(
  wordCount: number,
  triggerGuidance: () => void,
  isGameActive: boolean,
  delaySeconds: number = 15
): void {
  const triggeredRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If already triggered or game not active, don't set new timer
    if (triggeredRef.current || !isGameActive) {
      return;
    }

    // If player has submitted words, mark as triggered (no need to show tip)
    if (wordCount > 0) {
      triggeredRef.current = true;
      return;
    }

    // Set timer to show tip after delay if no words submitted
    timerRef.current = setTimeout(() => {
      if (wordCount === 0 && !triggeredRef.current) {
        triggeredRef.current = true;
        triggerGuidance();
      }
    }, delaySeconds * 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [wordCount, triggerGuidance, isGameActive, delaySeconds]);
}
