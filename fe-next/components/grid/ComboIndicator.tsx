'use client';

import React, { useEffect, useState, useReducer } from 'react';
import { m, AnimatePresence, useAnimation } from 'framer-motion';
import { cn } from '../../lib/utils';
import { getComboColors } from './comboColors';
import { useReducedMotion } from '../../utils/accessibility';
import { useDevicePerformance } from '../../hooks/useDevicePerformance';

interface ComboIndicatorProps {
  comboLevel: number;
  reduceMotion?: boolean; // Can still override via prop
}

// Total animation duration - badge shows then auto-dismisses
const TOTAL_DURATION = 2800; // ms - visible long enough to appreciate

// Sparkle particle component
const Sparkle: React.FC<{
  delay: number;
  angle: number;
  distance: number;
  color: string;
  size?: number;
}> = ({ delay, angle, distance, color, size = 8 }) => (
  <m.div
    className="absolute pointer-events-none combo-sparkle"
    style={{
      width: size,
      height: size,
      left: '50%',
      top: '50%',
      marginLeft: -size / 2,
      marginTop: -size / 2,
    }}
    initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
    animate={{
      scale: [0, 1.2, 0.8, 0],
      opacity: [0, 1, 0.6, 0],
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: [0, 180, 360],
    }}
    transition={{
      duration: 0.6,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94],
    }}
  >
    <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-lg">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  </m.div>
);

// Confetti particle for high combos
const Confetti: React.FC<{
  delay: number;
  startX: number;
  color: string;
}> = ({ delay, startX, color }) => (
  <m.div
    className="absolute w-2 h-3 pointer-events-none combo-confetti"
    style={{
      left: '50%',
      top: '50%',
      marginLeft: startX,
      backgroundColor: color,
      borderRadius: 2,
    }}
    initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
    animate={{
      y: [-10, -50, -30],
      x: [0, startX * 1.5, startX * 2],
      rotate: [0, 360, 540],
      opacity: [1, 0.8, 0],
    }}
    transition={{
      duration: 0.7,
      delay,
      ease: 'easeOut',
    }}
  />
);

// Glow ring component - synced with badge timing
const GlowRing: React.FC<{
  delay: number;
  color: string;
  scale?: number;
}> = ({ delay, color, scale = 2 }) => (
  <m.div
    className="absolute rounded-full pointer-events-none combo-glow-ring"
    style={{
      width: 120,
      height: 60,
      left: '50%',
      top: '50%',
      marginLeft: -60,
      marginTop: -30,
      border: `2px solid ${color}`,
      boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
    }}
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{
      scale: [0.5, scale],
      opacity: [0.8, 0],
    }}
    transition={{
      duration: 0.5,
      delay,
      ease: 'easeOut',
    }}
  />
);

const ComboIndicator: React.FC<ComboIndicatorProps> = ({
  comboLevel,
  reduceMotion: reduceMotionProp,
}) => {
  // Use system preference, but allow prop override
  const systemReducedMotion = useReducedMotion();
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();

  // Disable effects on low-end devices or when reduced motion is preferred
  const reduceMotion = reduceMotionProp ?? systemReducedMotion ?? isLowEnd;
  const skipParticles = isLowEnd || !enableComplexAnimations || reduceMotion;

  const comboColors = getComboColors(comboLevel);
  const controls = useAnimation();
  // Batch visibleCombo + animationKey — they always update together when combo fires
  type ComboDisplayState = { visibleCombo: number | null; animationKey: number };
  type ComboDisplayAction = { type: 'show'; combo: number } | { type: 'dismiss' };
  const [comboDisplay, dispatchComboDisplay] = useReducer(
    (state: ComboDisplayState, action: ComboDisplayAction): ComboDisplayState => {
      switch (action.type) {
        case 'show': return { visibleCombo: action.combo, animationKey: state.animationKey + 1 };
        case 'dismiss': return { ...state, visibleCombo: null };
        default: return state;
      }
    },
    { visibleCombo: null, animationKey: 0 }
  );
  const { visibleCombo, animationKey } = comboDisplay;
  const [sparkleData, setSparkleData] = useState<{ angle: number; distance: number }[]>([]);

  // Generate random sparkle data when animationKey changes
  useEffect(() => {
    const isHighCombo = comboLevel >= 5;
    const isExtremeCombo = comboLevel >= 15;
    // Skip sparkles entirely on low-end devices or when motion is reduced
    // Also reduce at extreme levels to prevent performance issues
    const count = skipParticles ? 0 : isExtremeCombo ? 4 : isHighCombo ? 6 : 4;
    const data = [...Array(count)].map((_, i) => ({
      angle: (i * (360 / count) + (Math.random() - 0.5) * 30) * (Math.PI / 180),
      distance: 50 + Math.random() * 30,
    }));
    setSparkleData(data);
  }, [comboLevel, animationKey, skipParticles]);

  // Show combo indicator and auto-dismiss
  useEffect(() => {
    if (comboLevel > 0 && comboColors.text) {
      // dispatch batches visibleCombo + animationKey in one update
      dispatchComboDisplay({ type: 'show', combo: comboLevel });

      // Auto-dismiss after animation completes
      const timer = setTimeout(() => {
        dispatchComboDisplay({ type: 'dismiss' });
      }, TOTAL_DURATION);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [comboLevel, comboColors.text]);

  // Screen shake for high combos - reduce intensity at extreme levels for performance
  useEffect(() => {
    if (comboLevel >= 5 && !reduceMotion) {
      // Cap shake intensity at extreme levels to prevent performance issues
      const isExtremeCombo = comboLevel >= 15;
      const shakeIntensity = isExtremeCombo 
        ? 4 
        : Math.min((comboLevel - 4) * 1.5, 6);
      controls.start({
        x: [0, -shakeIntensity, shakeIntensity, -shakeIntensity, 0],
        transition: { duration: 0.25, ease: 'easeInOut' },
      });
    }
  }, [comboLevel, controls, reduceMotion]);

  if (!visibleCombo || !comboColors.text) return null;

  const isHighCombo = visibleCombo >= 5;
  const isVeryHighCombo = visibleCombo >= 7;
  const isInsaneCombo = visibleCombo >= 10;
  const isExtremeCombo = visibleCombo >= 15;
  const isRainbow = comboColors.isRainbow;

  // Show actual combo count, not capped
  const displayText = `+${visibleCombo}`;

  const sparkleColors = isRainbow
    ? ['#FF3366', '#FFE135', '#00FFFF', '#FF1493', '#BFFF00']
    : ['#FFD700', '#FF6B35', '#FF3366', '#FFE135'];
  const confettiColors = ['#FF3366', '#00FFFF', '#FFE135', '#BFFF00', '#FF6B35', '#FF1493'];

  // Scale effects with combo level, but cap aggressively at very high levels for performance
  // Skip confetti entirely on low-end devices or when motion is reduced
  const confettiCount = skipParticles ? 0 : isExtremeCombo
    ? 8
    : Math.min(4 + (visibleCombo - 5) * 1, 12); // Reduced counts for better performance

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={`combo-${animationKey}`}
        className="fixed top-28 inset-s-4 sm:inset-s-1/2 sm:-translate-x-1/2 sm:rtl:translate-x-1/2 z-[80] pointer-events-none combo-indicator-container flex items-center justify-center"
        data-tutorial="combo"
        data-extreme={isExtremeCombo}
        initial={{ opacity: 1 }}
        animate={controls}
        exit={{ opacity: 0 }}
      >
        {/* Glow rings - skip on low-end devices for performance */}
        {!skipParticles && (
          <>
            <GlowRing delay={0} color={isRainbow ? '#FF1493' : '#FF6B35'} scale={2} />
            <GlowRing delay={0.08} color={isRainbow ? '#00FFFF' : '#FFD700'} scale={2.5} />
            {isHighCombo && !isExtremeCombo && <GlowRing delay={0.15} color="#FFFFFF" scale={3} />}
          </>
        )}

        {/* Sparkle particles - skip on low-end devices */}
        {!skipParticles && sparkleData.length > 0 && (
          <>
            {sparkleData.map((data, i) => (
              <Sparkle
                key={`sparkle-${animationKey}-${i}`}
                delay={i * 0.02}
                angle={data.angle}
                distance={data.distance}
                color={sparkleColors[i % sparkleColors.length]}
                size={isHighCombo ? 10 : 7}
              />
            ))}
          </>
        )}

        {/* Confetti for high combos - skip on low-end devices */}
        {!skipParticles && isHighCombo && confettiCount > 0 && (
          <>
            {[...Array(confettiCount)].map((_, i) => (
              <Confetti
                key={`confetti-${animationKey}-${i}`}
                delay={i * 0.02}
                startX={(i - confettiCount / 2) * 8}
                color={confettiColors[i % confettiColors.length]}
              />
            ))}
          </>
        )}

        {/* Main combo badge */}
        <m.div
          initial={{
            scale: 0,
            opacity: 0,
            rotate: -10,
            y: 15,
          }}
          animate={{
            // Quick pop in (0-12%), hold steady (12-90%), fast exit (90-100%)
            scale: [0, 1.2, 1.1, 1.1, 0],
            opacity: [0, 1, 1, 1, 0],
            rotate: [-10, 4, 0, 0, 8],
            y: [15, -3, 0, 0, -50],
          }}
          transition={{
            duration: TOTAL_DURATION / 1000,
            times: [0, 0.12, 0.18, 0.9, 1], // 12% entrance, 72% hold, 10% exit
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="relative"
        >
          {/* Badge content */}
          <m.div
            className={cn(
              'px-5 py-2.5 rounded-full font-extrabold text-2xl md:text-3xl text-white relative overflow-hidden',
              !isRainbow && 'bg-linear-to-r from-orange-500 via-red-500 to-pink-500',
              comboColors.shadow,
              'border-3 border-white/50'
            )}
            style={{
              filter: isRainbow
                ? 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.9))'
                : 'drop-shadow(0 0 15px rgba(251, 146, 60, 0.7))',
              ...(isRainbow && {
                background:
                  'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                backgroundSize: '300% 100%',
                // Disable infinite animation at extreme levels to prevent performance issues
                animation: reduceMotion || isExtremeCombo ? 'none' : 'rainbow-shift 1s linear infinite',
              }),
            }}
          >
            {/* Shimmer overlay - skip on low-end devices for performance */}
            {!skipParticles && !isExtremeCombo && (
              <m.div
                className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                style={{ zIndex: 5 }}
              >
                <m.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    width: '200%',
                    marginLeft: '-100%',
                  }}
                  animate={{ marginLeft: ['-100%', '100%'] }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1,
                    ease: 'easeInOut',
                  }}
                />
              </m.div>
            )}

            {/* Emoji */}
            <m.span
              className="relative z-10"
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                duration: 0.25,
                delay: 0.05,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {isRainbow ? '🌈' : '🔥'}
            </m.span>

            {/* Combo text - shows actual count */}
            <m.span
              className="relative z-10 ms-1.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              {displayText}
            </m.span>
          </m.div>

          {/* Streak text for high combos */}
          {isHighCombo && (
            <m.div
              className="absolute -bottom-7 left-1/2 whitespace-nowrap"
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1, 0.9], y: [5, 0, 0, -5] }}
              transition={{
                duration: TOTAL_DURATION / 1000,
                times: [0, 0.12, 0.9, 1], // Match badge timing
              }}
              style={{ transform: 'translateX(-50%)' }}
            >
              <span
                className="text-sm font-black uppercase tracking-wide px-3 py-1 rounded-neo"
                style={{
                  background: isInsaneCombo
                    ? 'linear-gradient(135deg, #FF1493, #00FFFF, #FFE135)'
                    : isVeryHighCombo
                    ? 'linear-gradient(135deg, #FF3366, #FF6B35)'
                    : '#1a1a2e',
                  color: '#FFFFFF',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0 #000',
                }}
              >
                {isInsaneCombo ? `🏆 LEGENDARY x${visibleCombo}!` : isVeryHighCombo ? '🔥 ON FIRE!' : 'COMBO'}
              </span>
            </m.div>
          )}
        </m.div>
      </m.div>
    </AnimatePresence>
  );
};

export default ComboIndicator;
