/**
 * AchievementCinematic Component
 *
 * Remotion composition for GOLD and PLATINUM achievement unlocks.
 * 7-second celebration with tier-specific effects:
 * 1. Silhouette (0-2s) - Badge icon as dark silhouette scaling up
 * 2. Color reveal (1.5-4s) - Gold: shimmer sweep. Platinum: reverse-shatter
 * 3. Name reveal (3-5s) - Achievement name with tier label
 * 4. Stats/celebrate (5-7s) - StatsPanel + Confetti
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
  FlashEffect,
  SparkleField,
  Confetti,
  ShatterFragment,
  ExplosionRing,
  type ConfettiParticle,
} from '../../../lib/remotion/primitives';

// ==============================================
// CONSTANTS
// ==============================================

export { ACHIEVEMENT_DURATION_FRAMES } from './achievementCinematicConstants';

const PHASE_FRAMES = {
  SILHOUETTE_START: 0,
  SILHOUETTE_END: 60,
  COLOR_START: 45,
  COLOR_END: 120,
  NAME_START: 90,
  NAME_END: 150,
  CELEBRATE_START: 150,
  CELEBRATE_END: 210,
};

// ==============================================
// TYPES
// ==============================================

export interface AchievementCinematicProps {
  /** Achievement name (translated) */
  achievementName: string;
  /** Achievement description (translated) */
  description: string;
  /** Achievement icon emoji */
  icon: string;
  /** Tier level */
  tier: 'GOLD' | 'PLATINUM';
  /** Tier primary color (hex) */
  tierColor: string;
  /** Tier glow color */
  tierGlow: string;
  /** Optional stat to display */
  stat?: { label: string; value: string | number };
  /** Translated tier label */
  tierLabel?: string;
  /** Translated "ACHIEVEMENT UNLOCKED!" text */
  unlockedText?: string;
}

// ==============================================
// TIER-SPECIFIC CONFIG
// ==============================================

interface TierEffects {
  sparkleColor: string;
  sparkleGlow: string;
  confettiColors: string[];
  bgIntensity: string;
  hasFlash: boolean;
  hasRings: boolean;
  fragmentCount: number;
}

const TIER_EFFECTS: Record<'GOLD' | 'PLATINUM', TierEffects> = {
  GOLD: {
    sparkleColor: '#FFD700',
    sparkleGlow: '#FFA500',
    confettiColors: ['#FFD700', '#FFA500', '#FFE135', '#B8860B', '#FFFFFF'],
    bgIntensity: '33',
    hasFlash: false,
    hasRings: false,
    fragmentCount: 0,
  },
  PLATINUM: {
    sparkleColor: '#E5E4E2',
    sparkleGlow: '#9370DB',
    confettiColors: ['#E5E4E2', '#9370DB', '#00FFFF', '#FF1493', '#FFFFFF'],
    bgIntensity: '44',
    hasFlash: true,
    hasRings: true,
    fragmentCount: 20,
  },
};

// ==============================================
// MAIN COMPONENT
// ==============================================

export const AchievementCinematic: React.FC<AchievementCinematicProps> = ({
  achievementName,
  description,
  icon,
  tier,
  tierColor,
  tierGlow,
  stat,
  tierLabel,
  unlockedText,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const effects = TIER_EFFECTS[tier];

  // Silhouette scale-up
  const silhouetteScale = interpolate(
    frame,
    [PHASE_FRAMES.SILHOUETTE_START, PHASE_FRAMES.SILHOUETTE_END],
    [0.3, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const silhouetteOpacity = interpolate(
    frame,
    [PHASE_FRAMES.SILHOUETTE_START, 15],
    [0, 1],
    { extrapolateRight: 'clamp' },
  );

  // Color reveal (shimmer for Gold, converge for Platinum)
  const colorReveal = interpolate(
    frame,
    [PHASE_FRAMES.COLOR_START, PHASE_FRAMES.COLOR_END],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Name reveal spring
  const nameReveal = spring({
    frame: frame - PHASE_FRAMES.NAME_START,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  // Celebration
  const celebrateReveal = spring({
    frame: frame - PHASE_FRAMES.CELEBRATE_START,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Confetti
  const confetti = useMemo<ConfettiParticle[]>(() => {
    const rand = createSeededRandom(tier === 'GOLD' ? 555 : 777);
    return Array.from({ length: tier === 'PLATINUM' ? 60 : 35 }, (_, i) => ({
      x: rand() * width,
      y: -20 - rand() * 200,
      color: effects.confettiColors[i % effects.confettiColors.length],
      speed: 3 + rand() * 3,
      wobble: rand() * Math.PI * 2,
      delay: rand() * 30,
    }));
  }, [width, tier, effects.confettiColors]);

  // Reverse-shatter fragments for Platinum
  const fragments = useMemo(() => {
    if (effects.fragmentCount === 0) return [];
    const rand = createSeededRandom(999);
    return Array.from({ length: effects.fragmentCount }, (_, i) => ({
      x: width / 2 + (rand() - 0.5) * 400,
      y: height / 2 + (rand() - 0.5) * 400,
      size: 15 + rand() * 25,
      rotation: (Math.PI * 2 * i) / effects.fragmentCount + rand() * 0.5,
      color: rand() > 0.5 ? '#9370DB' : '#00FFFF',
    }));
  }, [width, height, effects.fragmentCount]);

  // Gold shimmer sweep position (horizontal gradient sweep)
  const shimmerX = interpolate(
    frame,
    [PHASE_FRAMES.COLOR_START, PHASE_FRAMES.COLOR_END],
    [-100, 200],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      <BackgroundGlow color={tierColor} opacity={colorReveal * 0.8} intensity={effects.bgIntensity} />

      {/* Phase 1: Badge silhouette */}
      <Sequence from={PHASE_FRAMES.SILHOUETTE_START} durationInFrames={60} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: 0,
            right: 0,
            textAlign: 'center',
            transform: `scale(${silhouetteScale})`,
            opacity: silhouetteOpacity,
            filter: frame < PHASE_FRAMES.COLOR_START
              ? 'brightness(0.2) saturate(0)'
              : 'none',
          }}
        >
          <div style={{ fontSize: 96 }}>{icon}</div>
        </div>
      </Sequence>

      {/* Phase 2: Color reveal */}
      <Sequence from={PHASE_FRAMES.COLOR_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: colorReveal,
            transform: `scale(${0.8 + colorReveal * 0.2})`,
          }}
        >
          <div style={{ fontSize: 96, position: 'relative' }}>
            {icon}
            {/* Gold shimmer sweep overlay */}
            {tier === 'GOLD' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, transparent ${shimmerX - 30}%, rgba(255,255,255,0.4) ${shimmerX}%, transparent ${shimmerX + 30}%)`,
                  pointerEvents: 'none',
                  mixBlendMode: 'overlay',
                }}
              />
            )}
          </div>
        </div>

        {/* Platinum: reverse shatter converge */}
        {tier === 'PLATINUM' && fragments.map((f) => {
          // Reverse progress: fragments start scattered, converge to center
          const reverseFrame = Math.max(0, 60 - (frame - PHASE_FRAMES.COLOR_START));
          return (
            <ShatterFragment
              key={`${f.x}-${f.y}-${f.rotation}`}
              x={f.x}
              y={f.y}
              size={f.size}
              rotation={f.rotation}
              frame={reverseFrame}
              color={f.color}
            />
          );
        })}
      </Sequence>

      {/* Platinum flash */}
      {effects.hasFlash && (
        <Sequence from={PHASE_FRAMES.COLOR_END - 5} durationInFrames={5} premountFor={15}>
          <FlashEffect intensity={0.5} />
        </Sequence>
      )}

      {/* Platinum explosion rings */}
      {effects.hasRings && (
        <Sequence from={PHASE_FRAMES.COLOR_END - 10} durationInFrames={40} premountFor={15}>
          <ExplosionRing frame={frame - PHASE_FRAMES.COLOR_END + 10} color="#9370DB" delay={0} size={80} />
          <ExplosionRing frame={frame - PHASE_FRAMES.COLOR_END + 10} color="#00FFFF" delay={8} size={60} />
        </Sequence>
      )}

      {/* Phase 3: Achievement name */}
      <Sequence from={PHASE_FRAMES.NAME_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: nameReveal,
          }}
        >
          <div
            style={{
              fontFamily: rubikFamily,
              fontSize: 18,
              color: tierColor,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: 8,
            }}
          >
            {tierLabel ?? tier}
          </div>
          <div
            style={{
              fontFamily: fredokaFamily,
              fontSize: 20,
              color: '#ccc',
              marginBottom: 4,
            }}
          >
            {unlockedText}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '55%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: nameReveal,
            transform: `translateY(${(1 - nameReveal) * 20}px)`,
          }}
        >
          <h1
            style={{
              fontFamily: fredokaFamily,
              fontSize: 48,
              fontWeight: 700,
              color: 'white',
              textShadow: `3px 3px 0 black, 0 0 20px ${tierGlow}`,
              margin: 0,
            }}
          >
            {achievementName}
          </h1>
          <p
            style={{
              fontFamily: rubikFamily,
              fontSize: 22,
              color: '#aaa',
              textShadow: '2px 2px 0 black',
              marginTop: 10,
            }}
          >
            {description}
          </p>
        </div>
      </Sequence>

      {/* Phase 4: Stats + celebrate */}
      {stat && (
        <Sequence from={PHASE_FRAMES.CELEBRATE_START} premountFor={15}>
          <div
            style={{
              position: 'absolute',
              bottom: '18%',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              opacity: celebrateReveal,
            }}
          >
            <div
              style={{
                fontFamily: rubikFamily,
                fontSize: 20,
                color: tierColor,
                marginBottom: 4,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontFamily: fredokaFamily,
                fontSize: 40,
                fontWeight: 700,
                color: 'white',
                textShadow: '3px 3px 0 black',
              }}
            >
              {stat.value}
            </div>
          </div>
        </Sequence>
      )}

      {/* Confetti celebration */}
      <Sequence from={PHASE_FRAMES.CELEBRATE_START} premountFor={15}>
        <Confetti particles={confetti} frame={frame - PHASE_FRAMES.CELEBRATE_START} />
      </Sequence>

      {/* Sparkles throughout */}
      <Sequence from={PHASE_FRAMES.COLOR_START} premountFor={15}>
        <SparkleField
          count={tier === 'PLATINUM' ? 25 : 15}
          color={effects.sparkleColor}
          seed={tier === 'GOLD' ? 333 : 444}
          frame={frame - PHASE_FRAMES.COLOR_START}
          glowColor={effects.sparkleGlow}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

AchievementCinematic.displayName = 'AchievementCinematic';

export default AchievementCinematic;
