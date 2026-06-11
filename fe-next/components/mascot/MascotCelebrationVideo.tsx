'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MascotHaloGlow, type HaloIntensity, type HaloTone } from './MascotHaloGlow';
import { pickCelebrationSrc } from '@/lib/results/celebrationVariant';

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
  /**
   * One or more clips for this kind. One is picked per mount (seeded, stable
   * across re-renders) so repeat plays feel fresh. Add more clips to make a
   * kind randomly vary — until then a 1-element list is a stable no-op.
   */
  srcs: string[];
  tone: HaloTone;
  intensity: HaloIntensity;
  /** Default celebration title rendered above the video. Callers can override with the `title` prop. */
  defaultTitle: string;
  /** Tailwind text gradient classes for the title (`bg-linear-to-r ...`). */
  titleGradient: string;
  /** Edge-glow color stops — pulses in box-shadow around the video frame. */
  edgeGlow: { primary: string; secondary: string };
  /** Sparkle dot colors that orbit the video. */
  sparkleColors: string[];
}

const VARIANTS: Record<MascotCelebrationKind, VariantConfig> = {
  champion: {
    // v2 + v3 + reworked v4 (strong cube fidelity + trophy physical comedy). v1 deprecated (feedback: not good).
    srcs: ['/mascots/celebration-champion-2.mp4', '/mascots/celebration-champion-3.mp4', '/mascots/celebration-champion-4.mp4'],
    tone: 'yellow-orange',
    intensity: 'bold',
    defaultTitle: 'CHAMPION!',
    titleGradient: 'from-amber-300 via-yellow-200 to-amber-300',
    edgeGlow: { primary: '#FFE135', secondary: '#FF6B35' },
    sparkleColors: ['#FFE135', '#FF6B35', '#FFFFFF'],
  },
  'runner-up': {
    srcs: ['/mascots/celebration-runner-up.mp4'],
    tone: 'pink-cyan',
    intensity: 'medium',
    defaultTitle: 'PODIUM!',
    titleGradient: 'from-cyan-300 via-pink-300 to-cyan-300',
    edgeGlow: { primary: '#00FFFF', secondary: '#FF1493' },
    sparkleColors: ['#00FFFF', '#FF1493', '#FFFFFF'],
  },
  defeat: {
    // v1 + v2 + reworked v4 (witty charming trip + instant friendly GG recovery). v3 deprecated (feedback: not good).
    srcs: ['/mascots/celebration-defeat.mp4', '/mascots/celebration-defeat-2.mp4', '/mascots/celebration-defeat-4.mp4'],
    tone: 'purple-pink',
    intensity: 'subtle',
    defaultTitle: 'GG',
    titleGradient: 'from-purple-300 via-pink-300 to-purple-300',
    edgeGlow: { primary: '#8B5CF6', secondary: '#FF1493' },
    sparkleColors: ['#8B5CF6', '#FF1493', '#FFFFFF'],
  },
  bingo: {
    // Original + previous + latest post-feedback (7-tile juggle snap + big eureka spin + cool pose)
    srcs: ['/mascots/celebration-bingo.mp4', '/mascots/celebration-bingo-2.mp4', '/mascots/celebration-bingo-3.mp4'],
    tone: 'pink-cyan',
    intensity: 'bold',
    defaultTitle: 'BINGO!',
    titleGradient: 'from-cyan-300 via-pink-300 to-cyan-300',
    edgeGlow: { primary: '#FF1493', secondary: '#00FFFF' },
    sparkleColors: ['#FF1493', '#00FFFF', '#FFE135', '#FFFFFF'],
  },
  knight: {
    // Original + previous + latest post-feedback (pencil knight charge + helmet slip klutz + peace sign)
    srcs: ['/mascots/celebration-knight.mp4', '/mascots/celebration-knight-2.mp4', '/mascots/celebration-knight-3.mp4'],
    tone: 'pink-cyan',
    intensity: 'medium',
    defaultTitle: 'VICTORY!',
    titleGradient: 'from-pink-300 via-cyan-300 to-pink-300',
    edgeGlow: { primary: '#FF1493', secondary: '#00FFFF' },
    sparkleColors: ['#FF1493', '#00FFFF', '#FFFFFF'],
  },
  streak: {
    // Original + previous + latest post-feedback (flame surf + sash + air-guitar with strong energy)
    srcs: ['/mascots/celebration-streak.mp4', '/mascots/celebration-streak-2.mp4', '/mascots/celebration-streak-3.mp4'],
    tone: 'lime-cyan',
    intensity: 'bold',
    defaultTitle: 'ON FIRE!',
    titleGradient: 'from-lime-300 via-cyan-200 to-lime-300',
    edgeGlow: { primary: '#BFFF00', secondary: '#00FFFF' },
    sparkleColors: ['#BFFF00', '#00FFFF', '#FFE135'],
  },
  explorer: {
    // Still powered by knight variants (latest post-feedback knight-3 included for more variety)
    srcs: ['/mascots/celebration-knight.mp4', '/mascots/celebration-knight-2.mp4', '/mascots/celebration-knight-3.mp4'],
    tone: 'pink-cyan',
    intensity: 'bold',
    defaultTitle: 'NICE FIND!',
    titleGradient: 'from-cyan-300 via-pink-200 to-cyan-300',
    edgeGlow: { primary: '#00FFFF', secondary: '#FF1493' },
    sparkleColors: ['#00FFFF', '#FF1493', '#BFFF00', '#FFFFFF'],
  },
  'mission-complete': {
    // v1 + reworked v4 (broom sweep into chest + throne sit + big wave). v2/v3 deprecated (feedback: not good).
    srcs: ['/mascots/celebration-mission-complete.mp4', '/mascots/celebration-mission-complete-4.mp4'],
    tone: 'yellow-orange',
    intensity: 'bold',
    defaultTitle: 'ALL CLEAR!',
    titleGradient: 'from-yellow-300 via-orange-200 to-yellow-300',
    edgeGlow: { primary: '#FFE135', secondary: '#FF6B35' },
    sparkleColors: ['#FFE135', '#FF6B35', '#BFFF00'],
  },
};

/**
 * Position around the video frame (in % from top-left of the wrapper) for each
 * sparkle. 8 sparkles distributed roughly evenly around the perimeter with a
 * staggered animation offset — produces a "fireworks" feel without overlapping
 * the mascot face.
 */
const SPARKLE_POSITIONS: Array<{ top: string; left: string; size: number; delay: number; floatX: number; floatY: number }> = [
  { top: '-4%',  left: '14%', size: 14, delay: 0,    floatX: -6,  floatY: -10 },
  { top: '-6%',  left: '60%', size: 18, delay: 0.15, floatX:  8,  floatY: -12 },
  { top: '18%',  left: '-6%', size: 12, delay: 0.3,  floatX: -10, floatY:  6  },
  { top: '24%',  left: '96%', size: 16, delay: 0.45, floatX: 10,  floatY:  4  },
  { top: '58%',  left: '-5%', size: 14, delay: 0.6,  floatX: -8,  floatY: -4  },
  { top: '54%',  left: '98%', size: 12, delay: 0.75, floatX: 10,  floatY: -6  },
  { top: '92%',  left: '20%', size: 16, delay: 0.9,  floatX: -8,  floatY: 10  },
  { top: '94%',  left: '68%', size: 14, delay: 1.05, floatX:  8,  floatY: 12  },
];

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
  /**
   * Hero text rendered above the video. Pass a translated string from the parent
   * (the caller owns i18n via its `t()` function). Pass `null` to suppress the
   * built-in default title for this kind. Omit / pass `undefined` to use the
   * variant's default English title.
   */
  title?: string | null;
  /**
   * Demo / preview only: force a specific video src (e.g. the -3 variant)
   * instead of letting the kind pick from its srcs pool.
   */
  forceSrc?: string;
}

/**
 * AI-generated mascot celebration video.
 * - 5s seamless Kling 2.5 Turbo render per `kind`
 * - Wrapped in MascotHaloGlow (pink→cyan / lime / yellow per kind)
 * - Auto-dismisses after `autoDismissMs` (default 3.2s — gives time for celebration without holding up scoreboard)
 * - Respects prefers-reduced-motion (skips video, fades instantly)
 * - Hero title above + animated edge glow + floating sparkles for extra polish
 */
export const MascotCelebrationVideo = memo(function MascotCelebrationVideo({
  kind,
  size = 'clamp(220px, 60vmin, 480px)',
  autoDismissMs = 3200,
  onDone,
  overlay = true,
  className = '',
  title,
  forceSrc,
}: MascotCelebrationVideoProps) {
  const variant = VARIANTS[kind];
  // Pick a clip ONCE per mount. The results page re-renders frequently
  // (countdowns, score reveals); seeding from a mount-time random keeps the
  // same clip for the life of this celebration instead of reshuffling.
  const [clipSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const src = useMemo(
    () => (forceSrc ? forceSrc : pickCelebrationSrc(variant.srcs, clipSeed)),
    [variant.srcs, clipSeed, forceSrc]
  );
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

  // null = caller explicitly suppresses; undefined = fall back to variant default.
  const displayedTitle = title === null ? null : (title ?? variant.defaultTitle);

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
        // No dim/blur backdrop and click-through: the celebration plays over the
        // live results so the text stays readable and the page stays scrollable
        // and tappable the whole time it's on screen.
        pointerEvents: 'none',
        zIndex: 9998,
        animation: 'lcMcvEnter 280ms ease-out both, lcMcvExit 320ms ease-in forwards',
        animationDelay: `0ms, ${Math.max(autoDismissMs - 280, 0)}ms`,
      }
    : { position: 'relative' };

  // size scales with viewport; aspect-ratio: 1/1 keeps the box square so the
  // 1024x1024 source video never letterboxes on landscape phones or wide TVs.
  const wrapperStyle: CSSProperties = { width: size, maxWidth: '90vw', maxHeight: '85vh', aspectRatio: '1 / 1' };

  // Frame style: column-stack the title above the video + sparkle layer.
  const frameStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  };

  // Sparkle layer wraps the video so absolute-positioned sparkles can orbit it.
  const sparkleLayerStyle: CSSProperties = { position: 'relative', ...wrapperStyle };

  // Memoize the per-kind edge-glow keyframes name so we don't collide across
  // multiple celebrations rendered in the same DOM (rare, but possible during
  // exit transitions).
  const edgeGlowKey = useMemo(() => `lcMcvEdge_${kind}`, [kind]);
  const sparkleKey = useMemo(() => `lcMcvSparkle_${kind}`, [kind]);

  if (reducedMotion) {
    // Skip the video entirely; fire onDone fast so the UI flow continues.
    return null;
  }

  const { primary: glowPrimary, secondary: glowSecondary } = variant.edgeGlow;

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
        @keyframes lcMcvTitleIn {
          0%   { transform: translateY(-18px) scale(0.6) rotate(-4deg); opacity: 0; }
          60%  { transform: translateY(4px)  scale(1.12) rotate(2deg);  opacity: 1; }
          100% { transform: translateY(0)    scale(1)    rotate(0);     opacity: 1; }
        }
        @keyframes lcMcvTitleWobble {
          0%, 100% { transform: rotate(-1.5deg) scale(1); }
          50%      { transform: rotate(1.5deg)  scale(1.04); }
        }
        @keyframes ${edgeGlowKey} {
          0%, 100% {
            box-shadow:
              0 0 0 4px #000,
              0 0 18px 4px ${glowPrimary}99,
              0 0 36px 10px ${glowSecondary}66,
              0 0 60px 20px ${glowPrimary}33;
          }
          50% {
            box-shadow:
              0 0 0 4px #000,
              0 0 28px 8px ${glowSecondary}cc,
              0 0 56px 18px ${glowPrimary}99,
              0 0 92px 32px ${glowSecondary}55;
          }
        }
        @keyframes ${sparkleKey} {
          0%   { transform: translate(0,0) scale(0) rotate(0deg);   opacity: 0; }
          25%  { transform: translate(var(--lc-fx), var(--lc-fy)) scale(1.2) rotate(45deg); opacity: 1; }
          70%  { transform: translate(var(--lc-fx), var(--lc-fy)) scale(1)   rotate(140deg); opacity: 1; }
          100% { transform: translate(0,0) scale(0) rotate(180deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="mascot-celebration-edge-glow"],
          [data-testid="mascot-celebration-sparkle"],
          [data-testid="mascot-celebration-title"] {
            animation: none !important;
          }
        }
      `}</style>
      <div style={frameStyle}>
        {displayedTitle != null && (
          <div
            data-testid="mascot-celebration-title"
            className={`bg-linear-to-r ${variant.titleGradient} bg-clip-text text-transparent font-neo-display font-black uppercase tracking-wider`}
            style={{
              fontSize: 'clamp(28px, 7vmin, 56px)',
              lineHeight: 1,
              letterSpacing: '0.04em',
              textShadow: `0 0 18px ${glowPrimary}99, 0 0 36px ${glowSecondary}66`,
              filter: `drop-shadow(0 4px 0 rgba(0,0,0,0.85)) drop-shadow(0 0 12px ${glowPrimary}cc)`,
              animation: `lcMcvTitleIn 540ms cubic-bezier(0.34, 1.56, 0.64, 1) both, lcMcvTitleWobble 2.4s ease-in-out 0.6s infinite`,
              willChange: 'transform, opacity',
            }}
          >
            {displayedTitle}
          </div>
        )}
        <div style={sparkleLayerStyle}>
          {SPARKLE_POSITIONS.map((s, i) => {
            const color = variant.sparkleColors[i % variant.sparkleColors.length];
            return (
              <span
                key={i}
                data-testid="mascot-celebration-sparkle"
                aria-hidden
                style={{
                  position: 'absolute',
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  pointerEvents: 'none',
                  zIndex: 2,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${color} 0%, ${color}cc 40%, transparent 70%)`,
                  boxShadow: `0 0 ${s.size}px ${s.size / 2}px ${color}aa`,
                  // CSS variables consumed by the @keyframes for the float offset
                  ['--lc-fx' as string]: `${s.floatX}px`,
                  ['--lc-fy' as string]: `${s.floatY}px`,
                  animation: `${sparkleKey} 1.9s ease-in-out ${s.delay}s infinite`,
                  willChange: 'transform, opacity',
                }}
              />
            );
          })}
          <MascotHaloGlow tone={variant.tone} intensity={variant.intensity}>
            <div style={{ ...wrapperStyle, animation: 'lcMcvVideoIn 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both', position: 'relative' }}>
              <video
                ref={videoRef}
                src={src}
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
              {/* Animated edge glow — sits on top of the video as an overlay so
                  the pulsing box-shadow hugs the rounded video frame without
                  being clipped by overflow:hidden parents. */}
              <span
                data-testid="mascot-celebration-edge-glow"
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '24px',
                  pointerEvents: 'none',
                  animation: `${edgeGlowKey} 1.8s ease-in-out infinite`,
                  willChange: 'box-shadow',
                }}
              />
            </div>
          </MascotHaloGlow>
        </div>
      </div>
    </div>
  );
});
