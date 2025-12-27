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

  // Dismiss functions
  dismissComboTip: () => void;
  dismissEarthquakeTip: () => void;
  dismissFireRoundTip: () => void;

  // Trigger functions (call when event occurs)
  triggerComboGuidance: () => void;
  triggerEarthquakeGuidance: () => void;
  triggerFireRoundGuidance: () => void;
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

  // Track if we've already triggered during this session to prevent re-triggers
  const triggeredRef = useRef<Record<keyof GuidanceState, boolean>>({
    comboShown: false,
    earthquakeShown: false,
    fireRoundShown: false,
    directionPatternShown: false,
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

  return {
    showComboTip,
    showEarthquakeTip,
    showFireRoundTip,
    dismissComboTip,
    dismissEarthquakeTip,
    dismissFireRoundTip,
    triggerComboGuidance,
    triggerEarthquakeGuidance,
    triggerFireRoundGuidance,
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
