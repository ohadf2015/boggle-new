'use client';

import { useMemo, memo, useRef, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getComboColors } from '../grid/comboColors';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import FloatingCoinAnimation from './FloatingCoinAnimation';
import { InteractiveMascot } from '../ui/InteractiveMascot';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsSelecting } from '@/hooks/useSelectionStore';

interface ComboDisplayProps {
  comboLevel: number;
  compact?: boolean;
  className?: string;
  /** Whether combo timer is in danger zone (<30% remaining) */
  isDanger?: boolean;
  /** Time remaining as percentage (0-100), null when no active combo */
  timeRemaining?: number | null;
  /** Coin reward amount to animate (triggers animation when > 0) */
  coinReward?: number | null;
  /** Callback when coin animation completes */
  onCoinAnimationComplete?: () => void;
  /** Force high contrast mode for light backgrounds (e.g., landscape panels) */
  highContrast?: boolean;
}

// Rarity-based color scheme (gaming standard) - NEON colors for maximum vibrancy
type ComboRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

const RARITY_COLORS = {
  // Level 1-2: Common - Neon Green/Lime (electric green)
  common: {
    gradient: 'bg-linear-to-r from-neo-lime via-neo-lime to-emerald-400',
    sparkles: ['#39FF14', '#BFFF00', '#00FF7F', '#7FFF00'], // neon green variants
    glow: 'linear-gradient(90deg, #39FF14, #BFFF00, #00FF7F)',
    shadow: 'rgba(57, 255, 20, 0.8)', // neon green glow
    burst: '#39FF14',
  },
  // Level 3: Rare - Neon Cyan/Electric Blue
  rare: {
    gradient: 'bg-linear-to-r from-neo-cyan via-neo-cyan-light to-sky-400',
    sparkles: ['#00FFFF', '#00F5FF', '#00BFFF', '#7DF9FF'], // neon cyan variants
    glow: 'linear-gradient(90deg, #00FFFF, #00F5FF, #00BFFF)',
    shadow: 'rgba(0, 255, 255, 0.8)', // neon cyan glow
    burst: '#00FFFF',
  },
  // Level 4: Epic - Neon Magenta/Hot Pink
  epic: {
    gradient: 'bg-linear-to-r from-fuchsia-500 via-neo-pink to-pink-500',
    sparkles: ['#FF00FF', '#FF1493', '#FF00BF', '#FF69B4'], // neon magenta variants
    glow: 'linear-gradient(90deg, #FF00FF, #FF1493, #FF00BF)',
    shadow: 'rgba(255, 0, 255, 0.8)', // neon magenta glow
    burst: '#FF00FF',
  },
  // Level 5-6: Legendary - Neon Yellow/Gold (electric gold)
  legendary: {
    gradient: 'bg-linear-to-r from-neo-yellow via-yellow-300 to-amber-400',
    sparkles: ['#FFE135', '#FFFF00', '#FFD700', '#FFC300'], // neon yellow/gold variants
    glow: 'linear-gradient(90deg, #FFE135, #FFFF00, #FFD700)',
    shadow: 'rgba(255, 225, 53, 0.9)', // neon yellow glow
    burst: '#FFE135',
  },
  // Level 7+: Mythic - Rainbow (special handling, unchanged)
  mythic: {
    gradient: '', // handled separately with animation
    sparkles: ['#FF3366', '#FFE135', '#00FFFF', '#FF1493', '#BFFF00'],
    glow: 'linear-gradient(90deg, #dc2626, #ea580c, #ca8a04, #16a34a, #0891b2)',
    shadow: 'rgba(255, 255, 255, 0.6)',
    burst: '#fff',
  },
} as const;

function getComboRarity(level: number): ComboRarity {
  if (level >= 7) return 'mythic';
  if (level >= 5) return 'legendary';
  if (level === 4) return 'epic';
  if (level === 3) return 'rare';
  return 'common';
}

// Sparkle particle component - memoized and optimized for smooth animation
const Sparkle = memo<{
  index: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
}>(({ angle, distance, color, size, delay }) => (
  <m.div
    className="absolute pointer-events-none will-change-transform"
    style={{
      width: size,
      height: size,
      left: '50%',
      top: '50%',
      marginLeft: -size / 2,
      marginTop: -size / 2,
    }}
    animate={{
      // Simplified 4-step animation for smoother performance
      scale: [0, 1, 0.8, 0],
      opacity: [0, 1, 0.5, 0],
      x: [0, Math.cos(angle) * distance, Math.cos(angle) * distance * 1.1, 0],
      y: [0, Math.sin(angle) * distance, Math.sin(angle) * distance * 1.1, 0],
    }}
    transition={{
      duration: 1.5,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
      repeatDelay: 0.5, // Add pause between cycles
    }}
  >
    <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-lg">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  </m.div>
));

Sparkle.displayName = 'Sparkle';

/**
 * ComboDisplay - Text-based combo indicator with emoji
 * Shows current combo level as "🔥 x3 Combo" with gradient text and glow effects
 * Memoized to prevent unnecessary re-renders
 */
const ComboDisplay = memo<ComboDisplayProps>(({
  comboLevel,
  compact = false,
  className,
  isDanger = false,
  timeRemaining = null,
  coinReward = null,
  onCoinAnimationComplete,
  highContrast = false,
}) => {
  const { t } = useLanguage();
  const comboColors = getComboColors(comboLevel);
  const { isLowEnd, enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const isHighCombo = comboLevel >= 5;
  const isMythicCombo = comboLevel >= 7;
  const isInsaneCombo = comboLevel >= 10;
  const isMediumCombo = comboLevel >= 3;
  const isRainbow = comboColors.isRainbow;
  const showMascot = isHighCombo && !compact;
  // Pause infinite ornamental motion while the user is mid-drag — frame budget
  // belongs to grid rendering, not HUD decoration. Resumes the instant the
  // selection clears (mirrors the deferred-leaderboard freeze pattern).
  const isSelecting = useIsSelecting();

  // Track combo level changes for level-up effects
  const prevComboLevelRef = useRef(comboLevel);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Detect combo level increase and show level-up flash
  useEffect(() => {
    if (comboLevel > prevComboLevelRef.current && comboLevel >= 2) {
      setShowLevelUp(true);
      const timer = setTimeout(() => setShowLevelUp(false), 800);
      prevComboLevelRef.current = comboLevel;
      return () => clearTimeout(timer);
    }
    prevComboLevelRef.current = comboLevel;
    return undefined;
  }, [comboLevel]);

  // Get rarity-based colors
  const rarity = getComboRarity(comboLevel);
  const rarityColors = RARITY_COLORS[rarity];

  // Skip sparkle + infinite motion on low-end devices or mid-drag for better performance
  const skipSparkles = isLowEnd || !enableComplexAnimations || prefersReducedMotion || isSelecting;

  // Memoize sparkle data for performance - reduced distance in compact mode to prevent overflow
  const sparkleData = useMemo(() => {
    if (comboLevel < 3 || skipSparkles) return [];
    const count = isHighCombo ? 4 : 3; // Reduced count for better performance
    return [...Array(count)].map((_, i) => ({
      angle: (i * (360 / count)) * (Math.PI / 180),
      distance: compact ? 15 : 30, // Slightly reduced for smoother animation
      delay: i * 0.25,
    }));
  }, [comboLevel, isHighCombo, compact, skipSparkles]);

  // Use rarity-based sparkle colors
  const sparkleColors = rarityColors.sparkles;

  // Hide combo display only when level is 0 (show from first combo word)
  if (comboLevel < 1) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center relative overflow-visible',
        // Fixed width to prevent layout shifts when combo appears/changes
        // Increased compact width to fit full text without cutoff
        compact ? 'w-[100px]' : 'w-[130px]',
        className
      )}
    >
      <AnimatePresence mode="wait">
        <m.div
          key={`combo-${comboLevel}`}
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="relative"
        >
          {/* Sparkle particles for combos >= 3 */}
          {isMediumCombo && sparkleData.map((data, i) => (
            <Sparkle
              key={`sparkle-${i}`}
              index={i}
              angle={data.angle}
              distance={data.distance}
              color={sparkleColors[i % sparkleColors.length]}
              size={compact ? 6 : 8}
              delay={data.delay}
            />
          ))}

          {/* Combo Timer Arc - shows time remaining before combo expires
              NOTE: Always show timer arc regardless of device performance (essential gameplay feedback)
              Positioned to the left of combo text, vertically centered with small gap */}
          {timeRemaining !== null && timeRemaining > 0 && (
            <div
              className={cn(
                'absolute pointer-events-none top-1/2 -translate-y-1/2',
                compact ? '-inset-s-8' : '-inset-s-10'
              )}
            >
              <svg
                className={cn(
                  compact ? 'w-6 h-6' : 'w-8 h-8'
                )}
                viewBox="0 0 36 36"
              >
                {/* Background arc (darker) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Foreground arc (progress) */}
                <m.circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={
                    isDanger
                      ? '#FF4444' // Red when danger
                      : timeRemaining < 50
                      ? '#FFB800' // Yellow when < 50%
                      : rarityColors.burst // Rarity color otherwise
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(timeRemaining / 100) * 94.25} 94.25`}
                  transform="rotate(-90 18 18)"
                  animate={isDanger && !skipSparkles ? { opacity: [1, 0.6, 1] } : undefined}
                  transition={isDanger && !skipSparkles ? { duration: 0.5, repeat: Infinity } : undefined}
                  style={
                    skipSparkles
                      ? undefined // Skip filter on low-end devices for better performance
                      : { filter: `drop-shadow(0 0 4px ${isDanger ? '#FF4444' : rarityColors.shadow})` }
                  }
                />
              </svg>
            </div>
          )}

          {/* Main combo text - clean text-based display without badge.
              Infinite scale/opacity pulse suppressed while skipSparkles
              (low-end devices OR mid-drag) — kept main thread free for grid. */}
          <m.div
            animate={
              skipSparkles
                ? undefined
                : isDanger
                ? { opacity: [1, 0.85, 1], scale: [1, 1.02, 1] }
                : isHighCombo
                ? { scale: [1, 1.05, 1] }
                : undefined
            }
            transition={
              skipSparkles
                ? undefined
                : isDanger
                ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
                : isHighCombo
                ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                : undefined
            }
            className={cn(
              'relative',
              compact ? 'text-lg' : 'text-xl'
            )}
          >
            {/* Content - text with emoji */}
            <div
              className={cn(
                'flex items-center relative z-10 font-black',
                // Reduced gap in compact mode to fit within 80px width
                compact ? 'gap-0.5' : 'gap-1',
                // Text color with rarity-based gradient effect
                'text-transparent bg-clip-text',
                !isRainbow && rarityColors.gradient
              )}
              style={{
                // Enhanced text shadow for visibility
                WebkitTextStroke: highContrast ? '1px rgba(0,0,0,0.3)' : undefined,
                ...(isRainbow && {
                  background: 'linear-gradient(90deg, #dc2626, #ea580c, #ca8a04, #16a34a, #0891b2, #2563eb, #7c3aed, #db2777, #dc2626)',
                  backgroundSize: '300% 100%',
                  animation: 'rainbow-shift 1.5s linear infinite',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }),
              }}
            >
              {/* Fire emoji - simplified animation for performance */}
              <m.span
                className="text-[1.1em]"
                style={{
                  // Reset text styles for emoji to show properly
                  WebkitTextFillColor: 'initial',
                  filter: isDanger
                    ? `drop-shadow(0 0 6px ${rarityColors.shadow.replace('0.6', '0.8').replace('0.7', '0.9')})`
                    : `drop-shadow(0 0 ${isHighCombo ? '8px' : '4px'} ${rarityColors.shadow})`,
                }}
                animate={
                  skipSparkles
                    ? undefined // No animation on low-end devices
                    : {
                        scale: [1, isMediumCombo ? 1.15 : 1.05, 1],
                        rotate: [0, isMediumCombo ? 5 : 2, 0, isMediumCombo ? -5 : -2, 0],
                      }
                }
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatDelay: 0.3, // Small pause for less CPU usage
                }}
              >
                {isRainbow ? '🌈' : '🔥'}
              </m.span>

              {/* Combo count */}
              <m.span
                key={`level-${comboLevel}`}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="tabular-nums"
                style={{
                  textShadow: highContrast
                    ? '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.7)'
                    : `1px 1px 3px rgba(0,0,0,0.5), 0 0 10px ${rarityColors.shadow}`,
                }}
              >
                x{comboLevel}
              </m.span>

              {/* COMBO word - always visible now */}
              <span
                style={{
                  textShadow: highContrast
                    ? '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.7)'
                    : `1px 1px 3px rgba(0,0,0,0.5), 0 0 10px ${rarityColors.shadow}`,
                }}
              >
                {t('game.combo')}
              </span>
            </div>

            {/* Glow effect behind text - extends beyond container for full visibility */}
            {!skipSparkles && (
              <m.div
                className="absolute inset-0 pointer-events-none -z-10 blur-md scale-[1.3] rounded-full"
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  background: rarityColors.glow,
                }}
              />
            )}
          </m.div>

          {/* Status text below for high combos - matches rarity */}
          {/* Hidden in compact mode to prevent overflow */}
          {isHighCombo && !compact && (
            <m.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap',
                'text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded',
                rarity === 'mythic'
                  ? 'bg-linear-to-r from-pink-500 via-cyan-500 to-yellow-500 text-white'
                  : rarity === 'legendary'
                  ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-neo-black text-white'
              )}
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {isInsaneCombo ? 'GODLIKE!' : rarity === 'mythic' ? 'MYTHIC!' : 'LEGENDARY!'}
            </m.div>
          )}

          {/* Burst effect on combo increase — single ring (was 2; the second
              one cost twice the framer-motion bookkeeping for a barely-visible
              stagger). */}
          <m.div
            key={`burst-${comboLevel}`}
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              border: `3px solid ${rarityColors.burst}`,
              boxShadow: `0 0 20px ${rarityColors.shadow}`,
            }}
          />

          {/* Level Up flash - appears above combo when leveling up */}
          <AnimatePresence>
            {showLevelUp && !skipSparkles && (
              <m.div
                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                animate={{ opacity: 1, y: compact ? -28 : -35, scale: 1 }}
                exit={{ opacity: 0, y: compact ? -40 : -50, scale: 0.8 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 25,
                }}
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-20',
                  compact ? 'text-[10px]' : 'text-xs',
                  'font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                  'border-2 border-neo-black shadow-hard-sm'
                )}
                style={{
                  background: rarityColors.glow,
                  color: rarity === 'common' || rarity === 'legendary' ? '#1a1a2e' : '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                ⚡ +1
              </m.div>
            )}
          </AnimatePresence>

          {/* Mascot celebration for high combos (5+) - positioned to the left, doesn't affect layout */}
          {showMascot && (
            <m.div
              data-testid="combo-mascot"
              className="absolute -inset-s-10 top-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ scale: 0, opacity: 0, x: 20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0, opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <InteractiveMascot
                variant={isInsaneCombo ? 'onfire' : isMythicCombo ? 'cheering' : 'celebrating'}
                size="xs"
                animated={!prefersReducedMotion}
                enableHover={false}
                enableClick={false}
                clipBorder="none"
              />
            </m.div>
          )}
        </m.div>
      </AnimatePresence>

      {/* Coin reward animation */}
      <FloatingCoinAnimation
        coinAmount={coinReward}
        onAnimationComplete={onCoinAnimationComplete}
      />
    </div>
  );
});

ComboDisplay.displayName = 'ComboDisplay';

export default ComboDisplay;
