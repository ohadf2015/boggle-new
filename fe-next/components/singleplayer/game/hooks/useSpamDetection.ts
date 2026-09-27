'use client';

import { useRef, useCallback } from 'react';

// Default spam detection constants
const DEFAULT_SPAM_WINDOW_MS = 10000; // 10-second window
const DEFAULT_WARNING_THRESHOLD = 15; // Show warning after 15 submissions
const DEFAULT_COOLDOWN_THRESHOLD = 25; // Trigger cooldown after 25 submissions
const DEFAULT_COOLDOWN_DURATION_MS = 3000; // 3-second cooldown

interface UseSpamDetectionOptions {
  /** Time window in ms for tracking submissions (default: 10000) */
  windowMs?: number;
  /** Number of submissions before showing warning (default: 15) */
  warningThreshold?: number;
  /** Number of submissions before triggering cooldown (default: 25) */
  cooldownThreshold?: number;
  /** Cooldown duration in ms (default: 3000) */
  cooldownDurationMs?: number;
}

export interface UseSpamDetectionReturn {
  /**
   * Check if submission is allowed based on spam detection
   * Returns { allowed: true } or { allowed: false, remainingCooldown, isWarning }
   */
  checkSubmission: () => {
    allowed: boolean;
    remainingCooldown?: number;
    isWarning?: boolean;
    isCooldown?: boolean;
  };
  /** Reset spam detection state (e.g., for new game) */
  resetSpamDetection: () => void;
}

/**
 * Hook for detecting and preventing spam word submissions
 * Tracks submission frequency and enforces cooldowns
 */
export function useSpamDetection(options: UseSpamDetectionOptions = {}): UseSpamDetectionReturn {
  const {
    windowMs = DEFAULT_SPAM_WINDOW_MS,
    warningThreshold = DEFAULT_WARNING_THRESHOLD,
    cooldownThreshold = DEFAULT_COOLDOWN_THRESHOLD,
    cooldownDurationMs = DEFAULT_COOLDOWN_DURATION_MS,
  } = options;

  // Track recent submission timestamps for spam detection
  const submissionTimestampsRef = useRef<number[]>([]);
  // Track spam cooldown end time
  const spamCooldownUntilRef = useRef<number>(0);

  const checkSubmission = useCallback(() => {
    const now = Date.now();

    // Check if on cooldown
    if (spamCooldownUntilRef.current > now) {
      const remaining = Math.ceil((spamCooldownUntilRef.current - now) / 1000);
      return {
        allowed: false,
        remainingCooldown: remaining,
        isCooldown: true,
      };
    }

    // Prune old timestamps and add new one
    submissionTimestampsRef.current = submissionTimestampsRef.current.filter(
      ts => now - ts < windowMs
    );
    submissionTimestampsRef.current.push(now);

    const submissionCount = submissionTimestampsRef.current.length;

    // Check for spam cooldown threshold
    if (submissionCount >= cooldownThreshold) {
      spamCooldownUntilRef.current = now + cooldownDurationMs;
      return {
        allowed: false,
        isCooldown: true,
      };
    }

    // Warning for approaching limit
    if (submissionCount === warningThreshold) {
      return {
        allowed: true,
        isWarning: true,
      };
    }

    return { allowed: true };
  }, [windowMs, warningThreshold, cooldownThreshold, cooldownDurationMs]);

  const resetSpamDetection = useCallback(() => {
    submissionTimestampsRef.current = [];
    spamCooldownUntilRef.current = 0;
  }, []);

  return {
    checkSubmission,
    resetSpamDetection,
  };
}
