/**
 * BossDefeatCinematic Component
 *
 * Remotion composition for boss defeat/victory sequences.
 * 8-second victory celebration with:
 * 1. Boss stagger effect (0-1s)
 * 2. Boss shatter/dissolve (1-3s)
 * 3. Victory explosion (3-4s)
 * 4. Victory text reveal (4-6s)
 * 5. Rewards preview (6-8s)
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

// ==============================================
// SEEDED RANDOM (for pure render functions)
// ==============================================

/**
 * Simple seeded PRNG using mulberry32 algorithm.
 * Ensures fragments/confetti are deterministic across renders.
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
export const DEFEAT_DURATION_FRAMES = 240;

/** Phase timing in frames */
const PHASE_FRAMES = {
  STAGGER_START: 0,
  STAGGER_END: 30,
  SHATTER_START: 30,
  SHATTER_END: 90,
  EXPLOSION_START: 90,
  EXPLOSION_END: 120,
  VICTORY_TEXT_START: 120,
  VICTORY_TEXT_END: 180,
  REWARDS_START: 180,
  REWARDS_END: 240,
};

// ==============================================
// TYPES
// ==============================================

export interface BossDefeatCinematicProps {
  /** Boss display name (already translated) */
  bossName: string;
  /** Path to boss image (relative to public folder) */
  bossImagePath: string;
  /** Primary color for victory theme (hex) */
  primaryColor?: string;
  /** Secondary accent color (hex) */
  secondaryColor?: string;
  /** Gold earned from victory */
  goldEarned?: number;
  /** Experience earned from victory */
  xpEarned?: number;
  /** Whether this was a perfect victory (no damage taken) */
  perfectVictory?: boolean;
}

// ==============================================
// SHATTER FRAGMENT COMPONENT
// ==============================================

interface ShatterFragmentProps {
  x: number;
  y: number;
  size: number;
  rotation: number;
  frame: number;
  color: string;
}

/**
 * Individual shatter fragment for defeat effect
 */
const ShatterFragment: React.FC<ShatterFragmentProps> = ({
  x,
  y,
  size,
  rotation,
  frame,
  color,
}) => {
  // Animate outward explosion
  const progress = interpolate(frame, [0, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const xOffset = Math.cos(rotation) * progress * 400;
  const yOffset = Math.sin(rotation) * progress * 400 + progress * progress * 300;
  const scale = interpolate(progress, [0, 0.5, 1], [1, 1.2, 0]);
  const opacity = interpolate(progress, [0, 0.7, 1], [1, 0.8, 0]);
  const spin = rotation + progress * 720;

  return (
    <div
      style={{
        position: 'absolute',
        left: x + xOffset,
        top: y + yOffset,
        width: size,
        height: size,
        transform: `scale(${scale}) rotate(${spin}deg)`,
        opacity,
        backgroundColor: color,
        boxShadow: `0 0 ${size}px ${color}`,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        pointerEvents: 'none',
      }}
    />
  );
};

// ==============================================
// EXPLOSION RING COMPONENT
// ==============================================

interface ExplosionRingProps {
  frame: number;
  color: string;
  delay: number;
  size: number;
}

/**
 * Expanding ring for victory explosion effect
 */
const ExplosionRing: React.FC<ExplosionRingProps> = ({
  frame,
  color,
  delay,
  size,
}) => {
  const adjustedFrame = Math.max(0, frame - delay);
  const progress = interpolate(adjustedFrame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = 1 + progress * 3;
  const opacity = 1 - progress;
  const ringSize = size * scale;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: ringSize,
        height: ringSize,
        marginLeft: -ringSize / 2,
        marginTop: -ringSize / 2,
        borderRadius: '50%',
        border: `6px solid ${color}`,
        opacity,
        boxShadow: `
          0 0 20px ${color},
          inset 0 0 20px ${color}44
        `,
        pointerEvents: 'none',
      }}
    />
  );
};

// ==============================================
// CONFETTI PARTICLE COMPONENT
// ==============================================

interface ConfettiProps {
  particles: Array<{
    x: number;
    y: number;
    color: string;
    speed: number;
    wobble: number;
    delay: number;
  }>;
  frame: number;
}

/**
 * Victory confetti celebration
 */
const Confetti: React.FC<ConfettiProps> = ({ particles, frame }) => {
  return (
    <>
      {particles.map((p, i) => {
        const adjustedFrame = Math.max(0, frame - p.delay);
        const yOffset = adjustedFrame * p.speed;
        const xWobble = Math.sin(adjustedFrame * 0.1 + p.wobble) * 30;
        const rotation = adjustedFrame * 5;
        const opacity = interpolate(yOffset, [0, 500], [1, 0], {
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x + xWobble,
              top: p.y + yOffset,
              width: 10,
              height: 6,
              backgroundColor: p.color,
              transform: `rotate(${rotation}deg)`,
              opacity,
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

export const BossDefeatCinematic: React.FC<BossDefeatCinematicProps> = ({
  bossName,
  bossImagePath,
  primaryColor = '#FFE135',
  secondaryColor = '#00FFFF',
  goldEarned = 100,
  xpEarned = 50,
  perfectVictory = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ==============================================
  // ANIMATION VALUES
  // ==============================================

  // Stagger effect (0-30 frames / 0-1s)
  const staggerShake = interpolate(
    frame,
    [PHASE_FRAMES.STAGGER_START, PHASE_FRAMES.STAGGER_END],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  // Shatter explosion (30-90 frames / 1-3s)
  const shatterProgress = interpolate(
    frame,
    [PHASE_FRAMES.SHATTER_START, PHASE_FRAMES.SHATTER_END],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Victory text reveal (120+ frames / 4s+)
  const victoryReveal = spring({
    frame: frame - PHASE_FRAMES.VICTORY_TEXT_START,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  // Rewards reveal (180+ frames / 6s+)
  const rewardsReveal = spring({
    frame: frame - PHASE_FRAMES.REWARDS_START,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Generate shatter fragments (deterministic using seeded random)
  const fragments = useMemo(() => {
    const rand = createSeededRandom(42); // Seed for fragments
    return Array.from({ length: 30 }, (_, i) => ({
      x: width / 2 + (rand() - 0.5) * 100,
      y: height / 2 + (rand() - 0.5) * 100,
      size: 20 + rand() * 30,
      rotation: (Math.PI * 2 * i) / 30 + rand() * 0.5,
      color: rand() > 0.5 ? primaryColor : secondaryColor,
    }));
  }, [width, height, primaryColor, secondaryColor]);

  // Generate confetti particles (deterministic using seeded random)
  const confetti = useMemo(() => {
    const rand = createSeededRandom(123); // Different seed for confetti
    const colors = [primaryColor, secondaryColor, '#FF6B35', '#FF1493', '#FFFFFF'];
    return Array.from({ length: 50 }, (_, i) => ({
      x: rand() * width,
      y: -20 - rand() * 200,
      color: colors[i % colors.length],
      speed: 3 + rand() * 3,
      wobble: rand() * Math.PI * 2,
      delay: rand() * 30,
    }));
  }, [width, primaryColor, secondaryColor]);

  // Resolve image path
  // Resolve image path for Remotion Player
  // For client-side rendering, use the direct path (Remotion Player handles public folder)
  // For server-side rendering (video export), use staticFile()
  const imageSrc = typeof window !== 'undefined'
    ? bossImagePath // Client-side: use direct path
    : (bossImagePath.startsWith('/')
        ? staticFile(bossImagePath.slice(1))
        : staticFile(bossImagePath));

  // Calculate stagger shake offset
  const shakeX = staggerShake * Math.sin(frame * 2) * 15;
  const shakeY = staggerShake * Math.cos(frame * 3) * 10;

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${primaryColor}33, transparent 60%)`,
        }}
      />

      {/* Boss stagger phase - show boss shaking */}
      <Sequence
        from={PHASE_FRAMES.STAGGER_START}
        durationInFrames={PHASE_FRAMES.SHATTER_START - PHASE_FRAMES.STAGGER_START}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${shakeX}px), calc(-50% + ${shakeY}px))`,
          }}
        >
          <Img
            src={imageSrc}
            style={{
              maxWidth: 400,
              maxHeight: 400,
              objectFit: 'contain',
              filter: 'brightness(0.6) saturate(0.5)',
            }}
          />
        </div>
      </Sequence>

      {/* Boss shatter - fragments flying */}
      <Sequence
        from={PHASE_FRAMES.SHATTER_START}
        durationInFrames={PHASE_FRAMES.EXPLOSION_END - PHASE_FRAMES.SHATTER_START}
      >
        {fragments.map((f, i) => (
          <ShatterFragment
            key={i}
            x={f.x}
            y={f.y}
            size={f.size}
            rotation={f.rotation}
            frame={frame - PHASE_FRAMES.SHATTER_START}
            color={f.color}
          />
        ))}
      </Sequence>

      {/* Victory explosion rings */}
      <Sequence
        from={PHASE_FRAMES.EXPLOSION_START}
        durationInFrames={60}
      >
        <ExplosionRing
          frame={frame - PHASE_FRAMES.EXPLOSION_START}
          color={primaryColor}
          delay={0}
          size={100}
        />
        <ExplosionRing
          frame={frame - PHASE_FRAMES.EXPLOSION_START}
          color={secondaryColor}
          delay={10}
          size={80}
        />
        <ExplosionRing
          frame={frame - PHASE_FRAMES.EXPLOSION_START}
          color="#FFFFFF"
          delay={20}
          size={60}
        />
      </Sequence>

      {/* Flash effect on explosion */}
      <Sequence from={PHASE_FRAMES.EXPLOSION_START} durationInFrames={5}>
        <AbsoluteFill
          style={{
            backgroundColor: 'white',
            opacity: 0.6,
          }}
        />
      </Sequence>

      {/* Victory text */}
      <Sequence from={PHASE_FRAMES.VICTORY_TEXT_START}>
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: victoryReveal,
            transform: `scale(${victoryReveal})`,
          }}
        >
          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 96,
              fontWeight: 700,
              color: primaryColor,
              textShadow: `
                6px 6px 0 black,
                -3px -3px 0 black,
                0 0 40px ${primaryColor}
              `,
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            VICTORY!
          </h1>
          <p
            style={{
              fontFamily: 'Rubik, sans-serif',
              fontSize: 32,
              color: 'white',
              textShadow: '2px 2px 0 black',
              marginTop: 20,
            }}
          >
            {bossName} defeated!
          </p>
          {perfectVictory && (
            <p
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 24,
                color: secondaryColor,
                textShadow: '2px 2px 0 black',
                marginTop: 10,
              }}
            >
              PERFECT VICTORY
            </p>
          )}
        </div>
      </Sequence>

      {/* Rewards display */}
      <Sequence from={PHASE_FRAMES.REWARDS_START}>
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 60,
            opacity: rewardsReveal,
            transform: `translateY(${(1 - rewardsReveal) * 30}px)`,
          }}
        >
          {/* Gold reward */}
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 48,
                fontWeight: 700,
                color: '#FFD700',
                textShadow: '3px 3px 0 black',
              }}
            >
              +{goldEarned}
            </div>
            <div
              style={{
                fontFamily: 'Rubik, sans-serif',
                fontSize: 20,
                color: 'white',
                textShadow: '2px 2px 0 black',
              }}
            >
              GOLD
            </div>
          </div>

          {/* XP reward */}
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 48,
                fontWeight: 700,
                color: '#00FF88',
                textShadow: '3px 3px 0 black',
              }}
            >
              +{xpEarned}
            </div>
            <div
              style={{
                fontFamily: 'Rubik, sans-serif',
                fontSize: 20,
                color: 'white',
                textShadow: '2px 2px 0 black',
              }}
            >
              XP
            </div>
          </div>
        </div>
      </Sequence>

      {/* Confetti celebration */}
      <Sequence from={PHASE_FRAMES.VICTORY_TEXT_START}>
        <Confetti
          particles={confetti}
          frame={frame - PHASE_FRAMES.VICTORY_TEXT_START}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// ==============================================
// DISPLAY NAME & DEFAULT EXPORT
// ==============================================

BossDefeatCinematic.displayName = 'BossDefeatCinematic';

export default BossDefeatCinematic;
