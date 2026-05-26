'use client';

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { MascotHaloGlow, type HaloIntensity, type HaloTone } from './MascotHaloGlow';

export type MascotCelebrationKind =
  | 'champion'        // MP 1st place
  | 'runner-up'       // MP 2nd-3rd
  | 'defeat'          // MP last place
  | 'bingo'           // 7-letter / pangram / perfect score
  | 'knight'          // generic win / fallback
  | 'streak'          // daily streak alive
  | 'explorer'        // daily quest discovered
  | 'mission-complete'; // daily all-done

interface VariantConfig {
  src: string;
  tone: HaloTone;
  intensity: HaloIntensity;
}

const VARIANTS: Record<MascotCelebrationKind, VariantConfig> = {
  champion: { src: '/mascots/celebration-champion.mp4', tone: 'yellow-orange', intensity: 'bold' },
  'runner-up': { src: '/mascots/celebration-runner-up.mp4', tone: 'pink-cyan', intensity: 'medium' },
  defeat: { src: '/mascots/celebration-defeat.mp4', tone: 'purple-pink', intensity: 'subtle' },
  bingo: { src: '/mascots/celebration-bingo.mp4', tone: 'pink-cyan', intensity: 'bold' },
  knight: { src: '/mascots/celebration-knight.mp4', tone: 'pink-cyan', intensity: 'medium' },
  streak: { src: '/mascots/celebration-streak.mp4', tone: 'lime-cyan', intensity: 'bold' },
  explorer: { src: '/mascots/celebration-explorer.mp4', tone: 'pink-cyan', intensity: 'medium' },
  'mission-complete': { src: '/mascots/celebration-mission-complete.mp4', tone: 'yellow-orange', intensity: 'medium' },
};

export interface MascotCelebrationVideoProps {
  kind: MascotCelebrationKind;
  /**
   * Width in px or any valid CSS size string.
   * Default `clamp(220px, 60vmin, 480px)` — scales with the shorter viewport axis
   * so landscape phones, portrait phones, tablets, and TV all stay proportionate.
   */
  size?: string;
  /** Auto-dismiss after this many ms. 0 = never. Default 3200 */
  autoDismissMs?: number;
  /** Called when overlay finishes (auto-dismiss or video ended) */
  onDone?: () => void;
  /** Render as a fixed full-screen overlay (with dim backdrop) or inline */
  overlay?: boolean;
  /** Extra class on root */
  className?: string;
}

/**
 * AI-generated mascot celebration video.
 * - 5s seamless Kling 2.5 Turbo render per `kind`
 * - Wrapped in MascotHaloGlow (pink→cyan / lime / yellow per kind)
 * - Auto-dismisses after `autoDismissMs` (default 3.2s — gives time for celebration without holding up scoreboard)
 * - Respects prefers-reduced-motion (skips video, fades instantly)
 */
export const MascotCelebrationVideo = memo(function MascotCelebrationVideo({
  kind,
  size = 'clamp(220px, 60vmin, 480px)',
  autoDismissMs = 3200,
  onDone,
  overlay = true,
  className = '',
}: MascotCelebrationVideoProps) {
  const variant = VARIANTS[kind];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Keep the latest onDone in a ref so the auto-dismiss timer below depends only
  // on autoDismissMs. Parents commonly pass a fresh inline `onDone` arrow on
  // every render (e.g. DailyWordHuntResults re-renders each second from its
  // countdown); keying the timer on the callback identity would clear+reset it
  // before it ever fires, leaving this fixed full-screen overlay stuck on top of
  // the page and blocking scroll/taps.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  const handleDone = useCallback(() => onDoneRef.current?.(), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const t = window.setTimeout(handleDone, autoDismissMs);
    return () => window.clearTimeout(t);
  }, [autoDismissMs, handleDone]);

  const containerStyle: CSSProperties = overlay
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Respect notches / gesture bars
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--cap-safe-area-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        background: 'rgba(10, 24, 40, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9998,
        animation: 'lcMcvEnter 280ms ease-out both, lcMcvExit 320ms ease-in forwards',
        animationDelay: `0ms, ${Math.max(autoDismissMs - 280, 0)}ms`,
      }
    : { position: 'relative' };

  // size scales with viewport; aspect-ratio: 1/1 keeps the box square so the
  // 1024x1024 source video never letterboxes on landscape phones or wide TVs.
  const wrapperStyle: CSSProperties = { width: size, maxWidth: '90vw', maxHeight: '85vh', aspectRatio: '1 / 1' };

  if (reducedMotion) {
    // Skip the video entirely; fire onDone fast so the UI flow continues.
    return null;
  }

  return (
    <div
      data-testid="mascot-celebration-video"
      data-kind={kind}
      className={className}
      style={containerStyle}
      role={overlay ? 'status' : undefined}
      aria-live={overlay ? 'polite' : undefined}
    >
      <style>{`
        @keyframes lcMcvEnter {
          0%   { opacity: 0; transform: scale(0.94); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes lcMcvExit {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lcMcvVideoIn {
          0%   { transform: translateY(36px) scale(0.7); opacity: 0; }
          70%  { transform: translateY(-6px) scale(1.03); opacity: 1; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
      <MascotHaloGlow tone={variant.tone} intensity={variant.intensity}>
        <div style={{ ...wrapperStyle, animation: 'lcMcvVideoIn 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
          <video
            ref={videoRef}
            src={variant.src}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            // shadow-hard-xl auto-flips in RTL via the project's tailwind config
            // (-8px,8px on [dir="rtl"]). Pure tailwind keeps it consistent with
            // every other neo-brutalist surface in the app.
            className="block w-full h-full object-cover rounded-3xl border-4 border-black shadow-hard-xl"
            onEnded={handleDone}
          />
        </div>
      </MascotHaloGlow>
    </div>
  );
});
