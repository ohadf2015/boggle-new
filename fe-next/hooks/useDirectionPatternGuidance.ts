'use client';

import { useState, useCallback, useRef } from 'react';
import type { GridPosition } from '@/types';
import { isSimpleDirectionPath } from '@/utils/directionPatternDetector';
import {
  shouldShowGuidance,
  markGuidanceShown,
} from '@/utils/contextualGuidanceStorage';

// Number of consecutive simple-direction words needed to trigger guidance
const SIMPLE_DIRECTION_THRESHOLD = 3;

interface UseDirectionPatternGuidanceReturn {
  // Whether to show the direction guidance tooltip
  showDirectionGuidance: boolean;

  // Call this when a word is submitted with its path
  trackWordPath: (cells: GridPosition[]) => void;

  // Dismiss the guidance tooltip
  dismissDirectionGuidance: () => void;

  // Reset tracking (call on new game)
  resetTracking: () => void;
}

/**
 * useDirectionPatternGuidance - Hook to detect when players only use simple directions
 *
 * Tracks word paths and detects if the player is only finding words using
 * straight-line directions (horizontal, vertical, or diagonal) without
 * combining directions in a single word.
 *
 * After 3 consecutive simple-direction words, shows guidance explaining
 * that directions can be combined (e.g., go right then down).
 *
 * State is persisted in localStorage to show guidance only once per user.
 */
export function useDirectionPatternGuidance(): UseDirectionPatternGuidanceReturn {
  const [showDirectionGuidance, setShowDirectionGuidance] = useState(false);

  // Track consecutive simple-direction words
  const simpleDirectionCountRef = useRef(0);

  // Prevent re-triggering in same session
  const hasTriggeredRef = useRef(false);

  /**
   * Track a word path and check if guidance should be shown
   */
  const trackWordPath = useCallback((cells: GridPosition[]) => {
    // Skip if already triggered or guidance already shown before
    if (hasTriggeredRef.current) return;
    if (!shouldShowGuidance('directionPatternShown')) return;

    // Skip single-cell or empty paths (not meaningful for detection)
    if (cells.length < 2) return;

    // Check if this path uses only simple directions
    if (isSimpleDirectionPath(cells)) {
      simpleDirectionCountRef.current += 1;

      // Trigger guidance after threshold reached
      if (simpleDirectionCountRef.current >= SIMPLE_DIRECTION_THRESHOLD) {
        hasTriggeredRef.current = true;
        markGuidanceShown('directionPatternShown');
        setShowDirectionGuidance(true);
      }
    } else {
      // Mixed direction word found - player knows about direction changes
      // Reset counter and mark as shown so we don't bother them
      simpleDirectionCountRef.current = 0;

      // If they found a mixed-direction word, they understand the mechanic
      // Mark as shown so we never trigger for this user
      markGuidanceShown('directionPatternShown');
      hasTriggeredRef.current = true;
    }
  }, []);

  /**
   * Dismiss the guidance tooltip
   */
  const dismissDirectionGuidance = useCallback(() => {
    setShowDirectionGuidance(false);
  }, []);

  /**
   * Reset tracking for a new game
   * Note: Does NOT reset the localStorage flag - guidance is shown once ever
   */
  const resetTracking = useCallback(() => {
    simpleDirectionCountRef.current = 0;
    // Don't reset hasTriggeredRef - we only show once per session
    // Don't reset localStorage flag - guidance is shown once ever
  }, []);

  return {
    showDirectionGuidance,
    trackWordPath,
    dismissDirectionGuidance,
    resetTracking,
  };
}
