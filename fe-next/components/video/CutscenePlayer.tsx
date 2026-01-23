'use client';

/**
 * CutscenePlayer Component
 *
 * Plays cutscene videos (level intros, world transitions, tutorial)
 * with iOS Safari compatibility and skip functionality.
 *
 * Features:
 * - iOS Safari autoplay support (muted, playsInline)
 * - Configurable skip delay
 * - Language-aware video path selection
 * - RTL support for skip button positioning
 * - Reduced motion preference handling
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// World IDs for adventure mode
export type WorldId = 'meadows' | 'springs' | 'caverns';

// Cutscene types
export type CutsceneType = 'level-intro' | 'transition' | 'tutorial';

export interface CutscenePlayerProps {
  /** Type of cutscene to play */
  type: CutsceneType;
  /** World ID for level-intro cutscenes */
  worldId?: WorldId;
  /** Source world ID for transition cutscenes */
  fromWorldId?: WorldId;
  /** Destination world ID for transition cutscenes */
  toWorldId?: WorldId;
  /** Called when video ends naturally */
  onComplete?: () => void;
  /** Called when user skips the video */
  onSkip?: () => void;
  /** Delay in ms before skip button appears (default: 2000 for intros, 0 for tutorial) */
  allowSkipAfterMs?: number;
  /** Test mode - shows video path instead of playing video */
  testMode?: boolean;
}

/**
 * Default skip delay based on cutscene type
 */
const getDefaultSkipDelay = (type: CutsceneType): number => {
  switch (type) {
    case 'tutorial':
      return 0; // Immediately skippable per CONTEXT.md requirement
    case 'level-intro':
    case 'transition':
    default:
      return 2000; // 2 seconds for immersive experience
  }
};

/**
 * Constructs the video path based on cutscene type and locale
 */
const constructVideoPath = (
  type: CutsceneType,
  locale: string,
  worldId?: WorldId,
  fromWorldId?: WorldId,
  toWorldId?: WorldId
): string => {
  const basePath = '/videos/cutscenes';

  switch (type) {
    case 'level-intro':
      return `${basePath}/level-intro-${worldId}-${locale}.mp4`;
    case 'transition':
      return `${basePath}/transition-${fromWorldId}-${toWorldId}-${locale}.mp4`;
    case 'tutorial':
      return `${basePath}/tutorial-${locale}.mp4`;
    default:
      return `${basePath}/unknown-${locale}.mp4`;
  }
};

/**
 * Check if user prefers reduced motion
 */
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const CutscenePlayer: React.FC<CutscenePlayerProps> = ({
  type,
  worldId,
  fromWorldId,
  toWorldId,
  onComplete,
  onSkip,
  allowSkipAfterMs,
  testMode = false,
}) => {
  const { language, dir, t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const hasCalledCallback = useRef(false);

  // Determine skip delay
  const skipDelay = useMemo(() => {
    if (allowSkipAfterMs !== undefined) return allowSkipAfterMs;
    return getDefaultSkipDelay(type);
  }, [allowSkipAfterMs, type]);

  // Construct video path
  const videoPath = useMemo(
    () => constructVideoPath(type, language, worldId, fromWorldId, toWorldId),
    [type, language, worldId, fromWorldId, toWorldId]
  );

  // Handle reduced motion preference - skip video entirely
  useEffect(() => {
    if (prefersReducedMotion() && onComplete && !hasCalledCallback.current) {
      hasCalledCallback.current = true;
      onComplete();
    }
  }, [onComplete]);

  // Timer for skip button visibility
  useEffect(() => {
    // If reduced motion, don't set up timer (we already called onComplete)
    if (prefersReducedMotion()) return;

    if (skipDelay === 0) {
      setCanSkip(true);
      return;
    }

    const timer = setTimeout(() => {
      setCanSkip(true);
    }, skipDelay);

    return () => clearTimeout(timer);
  }, [skipDelay]);

  // Handle video ended event
  const handleEnded = useCallback(() => {
    if (isSkipped || hasCalledCallback.current) return;
    hasCalledCallback.current = true;
    onComplete?.();
  }, [isSkipped, onComplete]);

  // Handle skip button click
  const handleSkip = useCallback(() => {
    if (isSkipped || hasCalledCallback.current) return;
    setIsSkipped(true);
    hasCalledCallback.current = true;

    // Pause video immediately
    videoRef.current?.pause();

    // Call onSkip if provided, otherwise just mark as skipped
    onSkip?.();
  }, [isSkipped, onSkip]);

  // Position class for skip button based on RTL
  const skipButtonPositionClass = dir === 'rtl' ? 'left-4' : 'right-4';

  // If user prefers reduced motion, render nothing (onComplete already called)
  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-neo-navy flex items-center justify-center"
      data-testid="cutscene-player"
    >
      {/* Video Element */}
      {testMode ? (
        <div
          data-testid="video-path"
          className="text-neo-white font-mono text-sm"
        >
          {videoPath}
        </div>
      ) : (
        <video
          ref={videoRef}
          data-testid="cutscene-video"
          className="w-full h-full object-cover"
          src={videoPath}
          autoPlay
          muted
          playsInline
          onEnded={handleEnded}
        />
      )}

      {/* Skip Button */}
      {canSkip && (
        <button
          type="button"
          onClick={handleSkip}
          className={`
            absolute top-4 ${skipButtonPositionClass}
            px-4 py-2
            bg-neo-yellow text-neo-black
            font-neo-body font-bold
            border-3 border-neo-black
            shadow-hard
            transition-all duration-150
            hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]
            active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]
            animate-neo-pop
            rounded-neo
          `}
          aria-label={t('adventure.cutscene.skip') || 'Skip'}
        >
          {t('adventure.cutscene.skip') || 'Skip'}
        </button>
      )}
    </div>
  );
};

export default CutscenePlayer;
