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
} from 'remotion';
import { fredokaFamily, rubikFamily } from '../../../../lib/remotion/fonts';
import { createSeededRandom, normalizeImagePath } from '../../../../lib/remotion/utils';
import {
  BackgroundGlow,
  ShatterFragment,
  ExplosionRing,
  Confetti,
  FlashEffect,
  RewardDisplay,
  type ConfettiParticle,
  type RewardItem,
} from '../../../../lib/remotion/primitives';

// ==============================================
// CONSTANTS
// ==============================================

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
  /** Translated title text (default: "VICTORY!") */
  victoryText?: string;
  /** Translated "{bossName} defeated!" text */
  defeatedText?: string;
  /** Translated "PERFECT VICTORY" text */
  perfectText?: string;
  /** Translated reward labels */
  rewardLabels?: { gold?: string; xp?: string };
}

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
  victoryText = 'VICTORY!',
  defeatedText,
  perfectText = 'PERFECT VICTORY',
  rewardLabels = {},
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Stagger effect (0-30 frames / 0-1s)
  const staggerShake = interpolate(
    frame,
    [PHASE_FRAMES.STAGGER_START, PHASE_FRAMES.STAGGER_END],
    [0, 1],
    { extrapolateRight: 'clamp' },
  );

  // Victory text reveal (120+ frames / 4s+)
  const victoryReveal = spring({
    frame: frame - PHASE_FRAMES.VICTORY_TEXT_START,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  // Generate shatter fragments (deterministic)
  const fragments = useMemo(() => {
    const rand = createSeededRandom(42);
    return Array.from({ length: 30 }, (_, i) => ({
      x: width / 2 + (rand() - 0.5) * 100,
      y: height / 2 + (rand() - 0.5) * 100,
      size: 20 + rand() * 30,
      rotation: (Math.PI * 2 * i) / 30 + rand() * 0.5,
      color: rand() > 0.5 ? primaryColor : secondaryColor,
    }));
  }, [width, height, primaryColor, secondaryColor]);

  // Generate confetti particles (deterministic)
  const confetti = useMemo<ConfettiParticle[]>(() => {
    const rand = createSeededRandom(123);
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

  const imageSrc = normalizeImagePath(bossImagePath);

  // Stagger shake offset
  const shakeX = staggerShake * Math.sin(frame * 2) * 15;
  const shakeY = staggerShake * Math.cos(frame * 3) * 10;

  // Rewards array
  const rewards: RewardItem[] = [
    { label: rewardLabels.gold ?? 'GOLD', value: goldEarned, color: '#FFD700' },
    { label: rewardLabels.xp ?? 'XP', value: xpEarned, color: '#00FF88' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      <BackgroundGlow color={primaryColor} opacity={1} intensity="33" spread="60%" />

      {/* Boss stagger phase */}
      <Sequence
        from={PHASE_FRAMES.STAGGER_START}
        durationInFrames={PHASE_FRAMES.SHATTER_START - PHASE_FRAMES.STAGGER_START}
        premountFor={15}
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
        premountFor={15}
      >
        {fragments.map((f, i) => (
          <ShatterFragment
            key={`fragment-${i}-${f.x}-${f.y}`}
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
      <Sequence from={PHASE_FRAMES.EXPLOSION_START} durationInFrames={60} premountFor={15}>
        <ExplosionRing frame={frame - PHASE_FRAMES.EXPLOSION_START} color={primaryColor} delay={0} size={100} />
        <ExplosionRing frame={frame - PHASE_FRAMES.EXPLOSION_START} color={secondaryColor} delay={10} size={80} />
        <ExplosionRing frame={frame - PHASE_FRAMES.EXPLOSION_START} color="#FFFFFF" delay={20} size={60} />
      </Sequence>

      {/* Flash effect on explosion */}
      <Sequence from={PHASE_FRAMES.EXPLOSION_START} durationInFrames={5} premountFor={15}>
        <FlashEffect intensity={0.6} />
      </Sequence>

      {/* Victory text */}
      <Sequence from={PHASE_FRAMES.VICTORY_TEXT_START} premountFor={15}>
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
              fontFamily: fredokaFamily,
              fontSize: 96,
              fontWeight: 700,
              color: primaryColor,
              textShadow: `6px 6px 0 black, -3px -3px 0 black, 0 0 40px ${primaryColor}`,
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            {victoryText}
          </h1>
          <p
            style={{
              fontFamily: rubikFamily,
              fontSize: 32,
              color: 'white',
              textShadow: '2px 2px 0 black',
              marginTop: 20,
            }}
          >
            {defeatedText ?? `${bossName} defeated!`}
          </p>
          {perfectVictory && (
            <p
              style={{
                fontFamily: fredokaFamily,
                fontSize: 24,
                color: secondaryColor,
                textShadow: '2px 2px 0 black',
                marginTop: 10,
              }}
            >
              {perfectText}
            </p>
          )}
        </div>
      </Sequence>

      {/* Rewards display */}
      <Sequence from={PHASE_FRAMES.REWARDS_START} premountFor={15}>
        <RewardDisplay
          rewards={rewards}
          frame={frame - PHASE_FRAMES.REWARDS_START}
          fps={fps}
        />
      </Sequence>

      {/* Confetti celebration */}
      <Sequence from={PHASE_FRAMES.VICTORY_TEXT_START} premountFor={15}>
        <Confetti particles={confetti} frame={frame - PHASE_FRAMES.VICTORY_TEXT_START} />
      </Sequence>
    </AbsoluteFill>
  );
};

BossDefeatCinematic.displayName = 'BossDefeatCinematic';

export default BossDefeatCinematic;
