/**
 * BossEntranceCinematic Component
 *
 * Remotion composition for boss entrance sequences.
 * 8-second dramatic entrance with:
 * 1. Dark fade in (0-1s)
 * 2. Boss silhouette reveal (1-3s)
 * 3. Boss full reveal with particles (3-5s)
 * 4. Boss name title (5-7s)
 * 5. Battle ready transition (7-8s)
 *
 * Uses Remotion primitives for timing and animation.
 */

import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from 'remotion';
import { fredokaFamily, rubikFamily } from '../../../../lib/remotion/fonts';

// ==============================================
// SEEDED RANDOM (for pure render functions)
// ==============================================

/**
 * Simple seeded PRNG using mulberry32 algorithm.
 * Ensures particles are deterministic across renders.
 */
function createSeededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==============================================
// CONSTANTS
// ==============================================

/** Frame rate for all cinematics */
const FPS = 30;

/** Total duration in frames (8 seconds) */
export const ENTRANCE_DURATION_FRAMES = 240;

/** Phase timing in frames */
const PHASE_FRAMES = {
  FADE_IN_START: 0,
  FADE_IN_END: 30,
  SILHOUETTE_START: 30,
  SILHOUETTE_END: 90,
  REVEAL_START: 90,
  TITLE_START: 150,
  TITLE_END: 210,
  OUTRO_START: 210,
  OUTRO_END: 240,
};

// ==============================================
// TYPES
// ==============================================

export interface BossEntranceCinematicProps {
  /** Boss display name (already translated) */
  bossName: string;
  /** Boss subtitle (e.g., "Guardian of World 1") */
  bossTitle?: string;
  /** Path to boss image (relative to public folder) */
  bossImagePath: string;
  /** Primary color for boss theme (hex) */
  primaryColor?: string;
  /** World number for indicator */
  worldNumber?: number;
}

// ==============================================
// PARTICLE LAYER COMPONENT
// ==============================================

interface ParticleLayerProps {
  count: number;
  color: string;
  frame: number;
  width: number;
  height: number;
}

/**
 * Decorative particle layer for boss reveal
 */
const ParticleLayer: React.FC<ParticleLayerProps> = ({
  count,
  color,
  frame,
  width,
  height,
}) => {
  // Generate stable particles with useMemo (deterministic using seeded random)
  const particles = useMemo(() => {
    const rand = createSeededRandom(42); // Fixed seed for consistent particles
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * width,
      y: rand() * height,
      size: 4 + rand() * 8,
      speed: 0.5 + rand() * 1.5,
      delay: rand() * 30,
    }));
  }, [count, width, height]);

  return (
    <>
      {particles.map((p) => {
        const adjustedFrame = Math.max(0, frame - p.delay);
        const opacity = interpolate(adjustedFrame, [0, 30], [0, 0.8], {
          extrapolateRight: 'clamp',
        });
        const yOffset = adjustedFrame * p.speed;
        const fadeOut = 1 - yOffset / height;

        // Don't render if particle has moved off screen
        if (fadeOut <= 0) return null;

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y - yOffset,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: opacity * Math.max(0, fadeOut),
              boxShadow: `0 0 ${p.size}px ${color}`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
};

// ==============================================
// MAIN COMPONENT
// ==============================================

export const BossEntranceCinematic: React.FC<BossEntranceCinematicProps> = ({
  bossName,
  bossTitle,
  bossImagePath,
  primaryColor = '#FFE135',
  worldNumber = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ==============================================
  // ANIMATION VALUES
  // ==============================================

  // Initial fade in (0-30 frames / 0-1s)
  const fadeIn = interpolate(
    frame,
    [PHASE_FRAMES.FADE_IN_START, PHASE_FRAMES.FADE_IN_END],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  // Silhouette reveal (30-90 frames / 1-3s)
  const silhouetteReveal = interpolate(
    frame,
    [PHASE_FRAMES.SILHOUETTE_START, PHASE_FRAMES.SILHOUETTE_END],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Boss reveal with spring physics (90+ frames / 3s+)
  const bossReveal = spring({
    frame: frame - PHASE_FRAMES.REVEAL_START,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Title reveal (150-180 frames / 5-6s)
  const titleReveal = interpolate(
    frame,
    [PHASE_FRAMES.TITLE_START, PHASE_FRAMES.TITLE_START + 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Zoom pulse for impact (180-240 frames / 6-8s)
  const zoomPulse = interpolate(
    frame,
    [PHASE_FRAMES.TITLE_START + 30, PHASE_FRAMES.OUTRO_START, PHASE_FRAMES.OUTRO_END],
    [1, 1.05, 1],
    { extrapolateRight: 'clamp' }
  );

  // Resolve image path for Remotion Player
  // For client-side rendering, use the direct path (Remotion Player handles public folder)
  // For server-side rendering (video export), use staticFile()
  const imageSrc = typeof window !== 'undefined'
    ? bossImagePath // Client-side: use direct path
    : (bossImagePath.startsWith('/')
        ? staticFile(bossImagePath.slice(1))
        : staticFile(bossImagePath));

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      {/* Background gradient glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${primaryColor}22, transparent 70%)`,
          opacity: fadeIn,
        }}
      />

      {/* Lightning flash effects */}
      <Sequence from={15} durationInFrames={5} premountFor={15}>
        <AbsoluteFill
          style={{
            backgroundColor: 'white',
            opacity: 0.3,
          }}
        />
      </Sequence>
      <Sequence from={45} durationInFrames={3} premountFor={15}>
        <AbsoluteFill
          style={{
            backgroundColor: 'white',
            opacity: 0.2,
          }}
        />
      </Sequence>

      {/* Boss silhouette (dark shadow) */}
      <Sequence
        from={PHASE_FRAMES.SILHOUETTE_START}
        durationInFrames={PHASE_FRAMES.SILHOUETTE_END - PHASE_FRAMES.SILHOUETTE_START}
        premountFor={15}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${0.5 + silhouetteReveal * 0.5})`,
            opacity: silhouetteReveal,
            filter: 'brightness(0)',
          }}
        >
          <Img
            src={imageSrc}
            style={{
              maxWidth: 500,
              maxHeight: 500,
              objectFit: 'contain',
            }}
          />
        </div>
      </Sequence>

      {/* Boss full reveal with glow */}
      <Sequence from={PHASE_FRAMES.REVEAL_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -60%) scale(${bossReveal * zoomPulse})`,
            opacity: bossReveal,
          }}
        >
          <Img
            src={imageSrc}
            style={{
              maxWidth: 500,
              maxHeight: 500,
              objectFit: 'contain',
              filter: `drop-shadow(0 0 30px ${primaryColor}66)`,
            }}
          />
        </div>
      </Sequence>

      {/* Boss name title */}
      <Sequence from={PHASE_FRAMES.TITLE_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: titleReveal,
            transform: `translateY(${(1 - titleReveal) * 30}px)`,
          }}
        >
          <h1
            style={{
              fontFamily: fredokaFamily,
              fontSize: 72,
              fontWeight: 700,
              color: 'white',
              textShadow: `
                4px 4px 0 black,
                -2px -2px 0 black,
                0 0 30px ${primaryColor}
              `,
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            {bossName}
          </h1>
          {bossTitle && (
            <p
              style={{
                fontFamily: rubikFamily,
                fontSize: 28,
                color: primaryColor,
                textShadow: '2px 2px 0 black',
                marginTop: 10,
              }}
            >
              {bossTitle}
            </p>
          )}
        </div>
      </Sequence>

      {/* World indicator badge */}
      <Sequence from={PHASE_FRAMES.TITLE_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            opacity: titleReveal,
          }}
        >
          <span
            style={{
              fontFamily: fredokaFamily,
              fontSize: 24,
              color: 'white',
              padding: '8px 16px',
              backgroundColor: '#00000088',
              border: '3px solid white',
            }}
          >
            WORLD {worldNumber}
          </span>
        </div>
      </Sequence>

      {/* Decorative particles during reveal */}
      <Sequence from={PHASE_FRAMES.REVEAL_START} premountFor={15}>
        <ParticleLayer
          count={20}
          color={primaryColor}
          frame={frame - PHASE_FRAMES.REVEAL_START}
          width={width}
          height={height}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// ==============================================
// DISPLAY NAME & DEFAULT EXPORT
// ==============================================

BossEntranceCinematic.displayName = 'BossEntranceCinematic';

export default BossEntranceCinematic;
