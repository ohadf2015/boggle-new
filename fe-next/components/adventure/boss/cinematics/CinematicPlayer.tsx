/**
 * CinematicPlayer Component
 *
 * Wrapper component for Remotion Player with skip functionality.
 * Provides fullscreen overlay, skip button, keyboard controls, and progress bar.
 *
 * Skip button unlocks after 2 seconds per BOSS-04 requirement.
 *
 * Features:
 * - ESC key to skip (after 2s delay)
 * - Progress bar showing cinematic progress
 * - Countdown timer before skip is available
 * - Fullscreen or inline modes
 * - Reduced motion support
 */

'use client';

import React, { useEffect, useRef, ComponentType, useCallback } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import {
  useCinematic,
  SKIP_DELAY_MS,
  DEFAULT_FPS,
  secondsToFrames,
} from '../../../../hooks/useCinematic';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';
import { CinematicErrorBoundary } from './CinematicErrorBoundary';
import { CinematicFallback, type CinematicType } from './CinematicFallback';
import { useDevicePerformance } from '../../../../hooks/useDevicePerformance';

// ==============================================
// TYPES
// ==============================================

export interface CinematicPlayerProps {
  /** Remotion composition component */
  composition: ComponentType<Record<string, unknown>>;
  /** Props to pass to the composition */
  compositionProps?: Record<string, unknown>;
  /** Duration in seconds */
  durationSeconds: number;
  /** Called when cinematic ends (natural or skipped) */
  onComplete: () => void;
  /** Width of the player (default: 1280) */
  width?: number;
  /** Height of the player (default: 720) */
  height?: number;
  /** Whether to show as fullscreen overlay (default: true) */
  fullscreen?: boolean;
  /** Frames per second (default: 30) */
  fps?: number;
  /** Whether to auto-play (default: true) */
  autoPlay?: boolean;
  /** Test ID for testing */
  testId?: string;
  /** Enable debug mode with verbose logging (default: false) */
  debug?: boolean;
  /** Fallback cinematic type (for CSS fallback on mobile stall) */
  fallbackType?: CinematicType;
}

// ==============================================
// SKIP COUNTDOWN COMPONENT
// ==============================================

/**
 * Countdown component shown when skip is not yet available
 */
function SkipCountdown() {
  const { t } = useLanguage();
  const [countdown, setCountdown] = React.useState(Math.ceil(SKIP_DELAY_MS / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-gray-400">
      {t('adventure.bosses.cinematics.skipIn', { seconds: countdown })}
    </span>
  );
}

// ==============================================
// MAIN COMPONENT
// ==============================================

function CinematicPlayerInner({
  composition,
  compositionProps = {},
  durationSeconds,
  onComplete,
  width = 1280,
  height = 720,
  fullscreen = true,
  fps = DEFAULT_FPS,
  autoPlay = true,
  testId = 'cinematic-player',
  debug = false,
  fallbackType,
}: CinematicPlayerProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { isMobile } = useDevicePerformance();
  const playerRef = useRef<PlayerRef>(null);

  // Debug logging - must be defined before use
  const logDebug = useCallback((message: string, data?: unknown) => {
    if (debug) {
      console.log(`[CinematicPlayer] ${message}`, data ?? '');
    }
  }, [debug]);

  // Validate composition on mount (helps diagnose black screen issues)
  useEffect(() => {
    if (!composition) {
      console.error('[CinematicPlayer] composition prop is undefined/null!');
    } else if (typeof composition !== 'function') {
      console.error('[CinematicPlayer] composition is not a function:', typeof composition);
    } else {
      logDebug('Composition mounted', { name: composition.displayName || composition.name, durationSeconds });
    }
  }, [composition, durationSeconds, logDebug]);

  // Calculate frames from seconds
  const durationFrames = secondsToFrames(durationSeconds, fps);

  // Use cinematic hook for state management
  const {
    canSkip,
    progress,
    skip,
    handleFrameUpdate,
    isStalled,
  } = useCinematic({
    durationFrames,
    fps,
    onComplete,
    autoPlay, // Let Remotion Player handle autoplay natively
  });

  // ==============================================
  // KEYBOARD CONTROLS
  // ==============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip on ESC key (only if skip is available)
      if (e.key === 'Escape' && canSkip) {
        skip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSkip, skip]);

  // ==============================================
  // FRAME UPDATE LISTENER
  // ==============================================

  // Wire up Remotion Player's frameupdate event to useCinematic's handleFrameUpdate
  // This is CRITICAL for:
  // 1. Progress bar updates
  // 2. Natural completion detection
  // 3. Frame-based state tracking
  // Without this, the player appears frozen/black screen
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    logDebug('Setting up frameupdate listener');

    const handleFrame = (e: { detail: { frame: number } }) => {
      handleFrameUpdate(e.detail.frame);
    };

    player.addEventListener('frameupdate', handleFrame);

    return () => {
      logDebug('Removing frameupdate listener');
      player.removeEventListener('frameupdate', handleFrame);
    };
  }, [handleFrameUpdate, logDebug]);

  // ==============================================
  // REDUCED MOTION HANDLING
  // ==============================================

  // If user prefers reduced motion, skip to end immediately
  useEffect(() => {
    if (prefersReducedMotion && autoPlay) {
      // Give a brief moment for the component to mount, then complete
      const timeout = setTimeout(() => {
        logDebug('Reduced motion: auto-completing');
        onComplete();
      }, 500);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [prefersReducedMotion, autoPlay, onComplete, logDebug]);

  // Don't render full cinematic if reduced motion is preferred
  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        data-testid={testId}
      >
        <div className="text-neo-yellow text-2xl font-neo-display">
          {t('adventure.bosses.cinematics.loading')}
        </div>
      </div>
    );
  }

  // ==============================================
  // MOBILE: SKIP REMOTION ENTIRELY
  // ==============================================
  // Remotion Player fires JS frameupdate events on mobile but often renders
  // a black screen (canvas/WebGL rendering fails silently). Bypass it
  // entirely and use the lightweight CSS/Framer Motion fallback instead.

  if (isMobile && fallbackType) {
    logDebug('Mobile detected, using CSS fallback instead of Remotion');
    return (
      <CinematicFallback
        cinematicType={fallbackType}
        compositionProps={compositionProps}
        durationSeconds={durationSeconds}
        onComplete={onComplete}
      />
    );
  }

  // ==============================================
  // STALL FALLBACK (desktop edge cases)
  // ==============================================

  if (isStalled && fallbackType) {
    logDebug('Remotion stalled, switching to CSS fallback');
    return (
      <CinematicFallback
        cinematicType={fallbackType}
        compositionProps={compositionProps}
        durationSeconds={durationSeconds}
        onComplete={onComplete}
      />
    );
  }

  // ==============================================
  // RENDER
  // ==============================================

  const containerClasses = fullscreen
    ? 'fixed inset-0 z-50 bg-black flex items-center justify-center'
    : 'relative';

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Remotion Player */}
      {/* Portrait letterbox: on mobile portrait, scale 16:9 to fit screen width */}
      <Player
        ref={playerRef}
        component={composition}
        inputProps={compositionProps}
        durationInFrames={durationFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        style={(() => {
          if (!fullscreen) return { width, height, maxWidth: '100%', maxHeight: '100%' };
          // Detect portrait mobile
          const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
          const screenH = typeof window !== 'undefined' ? window.innerHeight : 720;
          const isPortrait = screenW < screenH;
          const isMobile = screenW < 768;
          const playerWidth = screenW;
          const playerHeight = isPortrait && isMobile
            ? Math.round(playerWidth * (720 / 1280))
            : screenH;
          return {
            width: playerWidth,
            height: playerHeight,
            maxWidth: '100%',
            maxHeight: '100%',
          };
        })()}
        autoPlay={autoPlay}
        loop={false}
        showVolumeControls={false}
        controls={false}
        acknowledgeRemotionLicense
        renderLoading={({ height: h, width: w }) => (
          <div
            style={{
              width: w,
              height: h,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0a0a1a',
            }}
          >
            <div style={{ color: '#FFE135', fontSize: 24, fontFamily: 'sans-serif' }}>
              Loading...
            </div>
          </div>
        )}
        errorFallback={({ error }) => {
          console.error('[CinematicPlayer] Remotion render error:', error);
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0a0a1a',
                color: '#FF6B35',
                fontSize: 18,
                fontFamily: 'sans-serif',
                padding: 20,
                textAlign: 'center',
              }}
            >
              Cinematic failed to load. Press ESC or wait to skip.
            </div>
          );
        }}
      />

      {/* Skip Button */}
      <AdaptiveAnimatePresence>
        <AdaptiveMotion.div
          className="absolute right-4 z-50"
          style={{ bottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            type="button"
            onClick={skip}
            disabled={!canSkip}
            className={`
              px-6 py-3 rounded-neo border-neo border-black
              font-neo-display text-lg
              transition-all duration-200
              ${
                canSkip
                  ? 'bg-neo-yellow hover:bg-neo-orange text-black cursor-pointer shadow-hard hover:shadow-hard-lg'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70'
              }
            `}
            data-testid="skip-button"
            aria-label={
              canSkip
                ? t('adventure.bosses.cinematics.skip')
                : t('adventure.bosses.cinematics.skipIn', { seconds: Math.ceil(SKIP_DELAY_MS / 1000) })
            }
          >
            {canSkip ? (
              <span className="flex items-center gap-2">
                {t('adventure.bosses.cinematics.skip')}
                {!isMobile && <kbd className="px-2 py-1 bg-black/20 rounded text-sm">ESC</kbd>}
              </span>
            ) : (
              <SkipCountdown />
            )}
          </button>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>

      {/* Progress Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-neo-navy-light"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('adventure.bosses.cinematics.progress')}
      >
        <AdaptiveMotion.div
          className="h-full bg-neo-yellow"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

// ==============================================
// WRAPPED COMPONENT WITH ERROR BOUNDARY
// ==============================================

CinematicPlayerInner.displayName = 'CinematicPlayer';

export function CinematicPlayer(props: CinematicPlayerProps) {
  return (
    <CinematicErrorBoundary onSkip={props.onComplete} testId={props.testId}>
      <CinematicPlayerInner {...props} />
    </CinematicErrorBoundary>
  );
}

CinematicPlayer.displayName = 'CinematicPlayer';

export default CinematicPlayer;
