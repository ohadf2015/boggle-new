'use client';

/**
 * LottieCelebration — DotLottie-powered celebration overlay
 *
 * Uses @lottiefiles/dotlottie-react for 10x smaller animations vs JSON Lottie.
 * Renders as a fullscreen pointer-events-none overlay by default.
 * Respects prefers-reduced-motion.
 *
 * Built-in presets use free LottieFiles animations.
 * Pass a custom `src` for project-specific .lottie files in /public/lottie/.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { DotLottieReact, type DotLottie } from '@lottiefiles/dotlottie-react';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

type CelebrationPreset = 'confetti' | 'fireworks' | 'trophy' | 'star-burst' | 'level-up';

interface LottieCelebrationProps {
  /** Show/hide the animation */
  show: boolean;
  /** Preset animation or custom .lottie URL */
  preset?: CelebrationPreset;
  /** Custom .lottie file path (overrides preset) */
  src?: string;
  /** Render as fullscreen overlay or inline */
  mode?: 'overlay' | 'inline';
  /** Loop the animation */
  loop?: boolean;
  /** Auto-hide after animation completes (ms). 0 = never. */
  autoHideAfter?: number;
  /** Playback speed multiplier */
  speed?: number;
  /** Size for inline mode */
  size?: number;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Preset paths — place .lottie files in /public/lottie/
 * Download from lottiefiles.com and convert to .lottie format for 10x smaller size.
 */
const PRESET_PATHS: Record<CelebrationPreset, string> = {
  confetti: '/lottie/confetti.lottie',
  fireworks: '/lottie/fireworks.lottie',
  trophy: '/lottie/trophy.lottie',
  'star-burst': '/lottie/star-burst.lottie',
  'level-up': '/lottie/level-up.lottie',
};

const LottieCelebration = memo<LottieCelebrationProps>(({
  show,
  preset = 'confetti',
  src,
  mode = 'overlay',
  loop = false,
  autoHideAfter = 3000,
  speed = 1,
  size = 200,
  onComplete,
  className,
}) => {
  const { prefersReducedMotion } = useDevicePerformance();
  const [visible, setVisible] = useState(false);

  const lottieSource = src || PRESET_PATHS[preset];

  useEffect(() => {
    if (show) {
      setVisible(true);

      if (autoHideAfter > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, autoHideAfter);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
    return undefined;
  }, [show, autoHideAfter, onComplete]);

  // Listen for 'complete' event on the DotLottie instance
  const handleDotLottieRef = useCallback((instance: DotLottie | null) => {
    if (!instance) return;
    if (!loop) {
      instance.addEventListener('complete', () => {
        onComplete?.();
      });
    }
  }, [loop, onComplete]);

  // Respect reduced motion — skip animation entirely
  if (prefersReducedMotion || !visible) return null;

  const lottieElement = (
    <DotLottieReact
      src={lottieSource}
      autoplay
      loop={loop}
      speed={speed}
      dotLottieRefCallback={handleDotLottieRef}
      className={mode === 'overlay' ? 'w-full h-full max-w-[600px] max-h-[600px]' : 'w-full h-full'}
    />
  );

  if (mode === 'overlay') {
    return (
      <div
        className={cn(
          'fixed inset-0 z-[100] pointer-events-none flex items-center justify-center',
          className
        )}
      >
        {lottieElement}
      </div>
    );
  }

  // Inline mode
  return (
    <div
      className={cn('inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {lottieElement}
    </div>
  );
});

LottieCelebration.displayName = 'LottieCelebration';

export default LottieCelebration;
