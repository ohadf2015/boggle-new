/**
 * StreakMilestoneCinematic Component
 *
 * Remotion composition for daily challenge streak milestones.
 * 8-second celebration with intensity scaling by tier:
 * 1. Count reveal (0-3s) - Streak number counts up
 * 2. Flame burst (2-5s) - Rising ember particles
 * 3. Badge reveal (4-6s) - Milestone badge with emoji + title
 * 4. Rewards (6-8s) - RewardDisplay + optional Confetti
 */

import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { fredokaFamily, rubikFamily } from '../../../lib/remotion/fonts';
import { createSeededRandom } from '../../../lib/remotion/utils';
import {
  BackgroundGlow,
  ParticleLayer,
  ExplosionRing,
  FlashEffect,
  Confetti,
  RewardDisplay,
  SparkleField,
  type ConfettiParticle,
  type RewardItem,
} from '../../../lib/remotion/primitives';

// ==============================================
// CONSTANTS
// ==============================================

/** Total duration in frames (8 seconds @ 30fps) */
export const STREAK_MILESTONE_DURATION_FRAMES = 240;

const PHASE_FRAMES = {
  COUNT_START: 0,
  COUNT_END: 90,
  FLAME_START: 60,
  FLAME_END: 150,
  BADGE_START: 120,
  BADGE_END: 180,
  REWARDS_START: 180,
  REWARDS_END: 240,
};

// ==============================================
// TIER CONFIG
// ==============================================

type Milestone = 7 | 14 | 30 | 50 | 100 | 365;

interface TierConfig {
  particleCount: number;
  colors: string[];
  glowIntensity: string;
  hasConfetti: boolean;
  hasRings: boolean;
  hasFlash: boolean;
}

const TIER_CONFIGS: Record<Milestone, TierConfig> = {
  7:   { particleCount: 12, colors: ['#FFB347'], glowIntensity: '22', hasConfetti: false, hasRings: false, hasFlash: false },
  14:  { particleCount: 18, colors: ['#FFB347', '#FF8C00'], glowIntensity: '28', hasConfetti: false, hasRings: false, hasFlash: false },
  30:  { particleCount: 25, colors: ['#FF6B35', '#FF4500'], glowIntensity: '33', hasConfetti: true, hasRings: false, hasFlash: false },
  50:  { particleCount: 35, colors: ['#FF4500', '#FFD700'], glowIntensity: '38', hasConfetti: true, hasRings: true, hasFlash: false },
  100: { particleCount: 45, colors: ['#FFD700', '#00FFFF', '#FF1493'], glowIntensity: '44', hasConfetti: true, hasRings: true, hasFlash: true },
  365: { particleCount: 60, colors: ['#FFE135', '#00FFFF', '#FF1493', '#FF6B35', '#00FF88'], glowIntensity: '55', hasConfetti: true, hasRings: true, hasFlash: true },
};

function getTierConfig(milestone: Milestone): TierConfig {
  return TIER_CONFIGS[milestone] ?? TIER_CONFIGS[7];
}

// ==============================================
// TYPES
// ==============================================

export interface StreakMilestoneCinematicProps {
  streakCount: number;
  milestone: Milestone;
  emoji: string;
  /** Translated title (e.g., "7 Day Streak!") */
  title: string;
  /** Translated subtitle (e.g., "MILESTONE!") */
  subtitle: string;
  rewards?: { type: string; amount: number }[];
}

// ==============================================
// MAIN COMPONENT
// ==============================================

export const StreakMilestoneCinematic: React.FC<StreakMilestoneCinematicProps> = ({
  streakCount,
  milestone,
  emoji,
  title,
  subtitle,
  rewards = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const tier = getTierConfig(milestone);

  // Count-up animation (number counts from 0 to streakCount)
  const countProgress = interpolate(
    frame,
    [PHASE_FRAMES.COUNT_START + 15, PHASE_FRAMES.COUNT_END - 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const displayCount = Math.round(countProgress * streakCount);

  // Number scale spring
  const numberSpring = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 60 },
  });

  // Badge reveal
  const badgeReveal = spring({
    frame: frame - PHASE_FRAMES.BADGE_START,
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  // Confetti particles
  const confetti = useMemo<ConfettiParticle[]>(() => {
    if (!tier.hasConfetti) return [];
    const rand = createSeededRandom(milestone * 7);
    return Array.from({ length: 40 }, (_, i) => ({
      x: rand() * width,
      y: -20 - rand() * 200,
      color: tier.colors[i % tier.colors.length],
      speed: 3 + rand() * 3,
      wobble: rand() * Math.PI * 2,
      delay: rand() * 30,
    }));
  }, [width, milestone, tier]);

  // Reward items
  const rewardItems: RewardItem[] = rewards.map((r) => ({
    label: r.type.toUpperCase(),
    value: r.amount,
    color: r.type === 'gold' ? '#FFD700' : '#00FF88',
  }));

  const primaryColor = tier.colors[0];

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      <BackgroundGlow color={primaryColor} opacity={0.8} intensity={tier.glowIntensity} />

      {/* Phase 1: Count reveal */}
      <Sequence from={PHASE_FRAMES.COUNT_START} durationInFrames={90} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: 0,
            right: 0,
            textAlign: 'center',
            transform: `scale(${numberSpring})`,
          }}
        >
          <div
            style={{
              fontFamily: fredokaFamily,
              fontSize: 120,
              fontWeight: 700,
              color: primaryColor,
              textShadow: `6px 6px 0 black, 0 0 40px ${primaryColor}`,
            }}
          >
            {displayCount}
          </div>
        </div>
      </Sequence>

      {/* Phase 2: Rising ember particles */}
      <Sequence from={PHASE_FRAMES.FLAME_START} premountFor={15}>
        <ParticleLayer
          count={tier.particleCount}
          color={primaryColor}
          frame={frame - PHASE_FRAMES.FLAME_START}
          width={width}
          height={height}
          seed={milestone}
          sizeRange={[3, 10]}
        />
      </Sequence>

      {/* Explosion rings for high tiers */}
      {tier.hasRings && (
        <Sequence from={PHASE_FRAMES.BADGE_START - 10} durationInFrames={40} premountFor={15}>
          {tier.colors.map((color, i) => (
            <ExplosionRing
              key={`ring-${color}-${i}`}
              frame={frame - PHASE_FRAMES.BADGE_START + 10}
              color={color}
              delay={i * 8}
              size={80 + i * 20}
            />
          ))}
        </Sequence>
      )}

      {/* Flash for highest tiers */}
      {tier.hasFlash && (
        <Sequence from={PHASE_FRAMES.BADGE_START} durationInFrames={4} premountFor={15}>
          <FlashEffect intensity={0.4} />
        </Sequence>
      )}

      {/* Phase 3: Badge reveal */}
      <Sequence from={PHASE_FRAMES.BADGE_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: badgeReveal,
            transform: `scale(${badgeReveal})`,
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 12 }}>{emoji}</div>
          <h1
            style={{
              fontFamily: fredokaFamily,
              fontSize: 56,
              fontWeight: 700,
              color: primaryColor,
              textShadow: `4px 4px 0 black, 0 0 30px ${primaryColor}`,
              margin: 0,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontFamily: rubikFamily,
              fontSize: 28,
              color: '#00FFFF',
              textShadow: '2px 2px 0 black',
              marginTop: 12,
            }}
          >
            {subtitle}
          </p>
        </div>
      </Sequence>

      {/* Phase 4: Rewards */}
      {rewardItems.length > 0 && (
        <Sequence from={PHASE_FRAMES.REWARDS_START} premountFor={15}>
          <RewardDisplay
            rewards={rewardItems}
            frame={frame - PHASE_FRAMES.REWARDS_START}
            fps={fps}
          />
        </Sequence>
      )}

      {/* Confetti */}
      {tier.hasConfetti && confetti.length > 0 && (
        <Sequence from={PHASE_FRAMES.BADGE_START} premountFor={15}>
          <Confetti particles={confetti} frame={frame - PHASE_FRAMES.BADGE_START} />
        </Sequence>
      )}

      {/* Sparkles */}
      <Sequence from={PHASE_FRAMES.FLAME_START} premountFor={15}>
        <SparkleField
          count={15}
          color={primaryColor}
          seed={milestone * 13}
          frame={frame - PHASE_FRAMES.FLAME_START}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

StreakMilestoneCinematic.displayName = 'StreakMilestoneCinematic';

export default StreakMilestoneCinematic;
