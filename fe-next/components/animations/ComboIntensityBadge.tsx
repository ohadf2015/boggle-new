'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { m, AnimatePresence, useSpring } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';
import { Zap, Flame, Star, Crown } from 'lucide-react';

interface ComboIntensityBadgeProps {
  /** Current combo count */
  combo: number;
  /** Combo multiplier (e.g., 1.5x, 2x) */
  multiplier?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show pulse animation */
  showPulse?: boolean;
  /** Show intensity particles */
  showParticles?: boolean;
  /** Callback when combo changes */
  onComboChange?: (combo: number, direction: 'up' | 'down' | 'reset') => void;
  /** Additional className */
  className?: string;
}

// Intensity levels based on combo count
const INTENSITY_LEVELS = {
  none: { threshold: 0, color: 'bg-neutral-600', glow: 'transparent', icon: null },
  low: { threshold: 2, color: 'bg-neo-cyan', glow: '#00FFFF', icon: Zap },
  medium: { threshold: 5, color: 'bg-neo-lime', glow: '#FFE135', icon: Flame },
  high: { threshold: 10, color: 'bg-neo-orange', glow: '#FF6B35', icon: Star },
  max: { threshold: 20, color: 'bg-neo-pink', glow: '#FF1493', icon: Crown },
};

/**
 * ComboIntensityBadge - Dynamic combo display with intensity-based styling
 *
 * Features:
 * - Progressive color/icon changes based on combo level
 * - Scale and shake animations on combo increase
 * - Glow intensity that grows with combo
 * - Pulse ring effect for high combos
 * - Performance-adaptive particle effects
 *
 * @example
 * ```tsx
 * <ComboIntensityBadge
 *   combo={currentCombo}
 *   multiplier={comboMultiplier}
 *   showPulse
 *   showParticles
 *   onComboChange={(c, dir) => playComboSound(dir)}
 * />
 * ```
 */
export function ComboIntensityBadge({
  combo,
  multiplier,
  size = 'md',
  showPulse = true,
  showParticles = true,
  onComboChange,
  className,
}: ComboIntensityBadgeProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects, enableComplexAnimations } =
    useDevicePerformance();
  // Batch prevCombo + isIncreasing + showComboUp — always update together on combo change
  type ComboAnimState = { prevCombo: number; isIncreasing: boolean; showComboUp: boolean };
  type ComboAnimAction =
    | { type: 'increase'; combo: number }
    | { type: 'clearAnim'; combo: number }
    | { type: 'sync'; combo: number };
  const [comboAnim, dispatchComboAnim] = useReducer(
    (state: ComboAnimState, action: ComboAnimAction): ComboAnimState => {
      switch (action.type) {
        case 'increase': return { prevCombo: action.combo, isIncreasing: true, showComboUp: true };
        case 'clearAnim': return { ...state, isIncreasing: false, showComboUp: false };
        case 'sync': return { ...state, prevCombo: action.combo };
        default: return state;
      }
    },
    { prevCombo: combo, isIncreasing: false, showComboUp: false }
  );
  const { prevCombo, isIncreasing, showComboUp } = comboAnim;

  // Determine intensity level
  const intensity = useMemo(() => {
    if (combo >= INTENSITY_LEVELS.max.threshold) return INTENSITY_LEVELS.max;
    if (combo >= INTENSITY_LEVELS.high.threshold) return INTENSITY_LEVELS.high;
    if (combo >= INTENSITY_LEVELS.medium.threshold) return INTENSITY_LEVELS.medium;
    if (combo >= INTENSITY_LEVELS.low.threshold) return INTENSITY_LEVELS.low;
    return INTENSITY_LEVELS.none;
  }, [combo]);

  // Pre-compute particle angles to avoid Math.random during render
  const particleAngles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const baseAngle = (360 / 6) * i;
      // Use deterministic offset based on index instead of random
      const offset = ((i * 17) % 30);
      return baseAngle + offset;
    });
  }, []);

  // Spring animation for smooth scaling
  const springScale = useSpring(1, { stiffness: 300, damping: 20 });
  const glowIntensity = useSpring(0, { stiffness: 100, damping: 30 });

  // Watch for combo changes
  useEffect(() => {
    if (combo !== prevCombo) {
      const direction = combo > prevCombo ? 'up' : combo === 0 ? 'reset' : 'down';
      onComboChange?.(combo, direction);

      if (direction === 'up') {
        // dispatch batches prevCombo + isIncreasing + showComboUp in one update
        dispatchComboAnim({ type: 'increase', combo });
        springScale.set(1.2);
        glowIntensity.set(1);

        setTimeout(() => {
          springScale.set(1);
          glowIntensity.set(combo / 20); // Normalize glow to combo level
        }, 150);

        setTimeout(() => {
          dispatchComboAnim({ type: 'clearAnim', combo });
        }, 600);
      } else {
        dispatchComboAnim({ type: 'sync', combo });
      }
    }
  }, [combo, prevCombo, onComboChange, springScale, glowIntensity]);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'px-2 py-1 text-sm min-w-[50px]',
      icon: 'w-3 h-3',
      multiplier: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5 text-lg min-w-[70px]',
      icon: 'w-4 h-4',
      multiplier: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2 text-2xl min-w-[90px]',
      icon: 'w-5 h-5',
      multiplier: 'text-base',
    },
  };

  const IconComponent = intensity.icon;
  const shouldShowGlow = enableGlowEffects && !isLowEnd && combo >= 2;
  const shouldShowParticles = showParticles && enableComplexAnimations && !isLowEnd && isIncreasing;

  // Don't show badge if combo is 0
  if (combo < 1) return null;

  // Reduced motion variant
  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          'rounded-neo border-3 border-neo-black shadow-hard',
          intensity.color,
          sizeConfig[size].container,
          'font-black text-neo-black text-center',
          className
        )}
      >
        {combo}x
        {multiplier && (
          <span className={cn('ms-1 opacity-70', sizeConfig[size].multiplier)}>
            ({multiplier}x)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Pulse rings */}
      {showPulse && combo >= 5 && !isLowEnd && (
        <>
          <m.div
            className={cn(
              'absolute inset-0 rounded-neo border-2',
              combo >= 20
                ? 'border-neo-pink'
                : combo >= 10
                  ? 'border-neo-orange'
                  : 'border-neo-lime'
            )}
            animate={{
              scale: [1, 1.5, 1.8],
              opacity: [0.5, 0.3, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          {combo >= 10 && (
            <m.div
              className={cn(
                'absolute inset-0 rounded-neo border-2',
                combo >= 20 ? 'border-neo-pink' : 'border-neo-orange'
              )}
              animate={{
                scale: [1, 1.3, 1.5],
                opacity: [0.4, 0.2, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: 0.3,
                ease: 'easeOut',
              }}
            />
          )}
        </>
      )}

      {/* Main badge */}
      <m.div
        className={cn(
          'relative rounded-neo border-3 border-neo-black overflow-hidden',
          intensity.color,
          sizeConfig[size].container,
          'font-black text-neo-black text-center'
        )}
        style={{
          scale: springScale,
          boxShadow: shouldShowGlow
            ? `4px 4px 0 black, 0 0 ${20 + combo}px ${intensity.glow}60`
            : '4px 4px 0 black',
        }}
        animate={
          isIncreasing
            ? {
                rotate: [0, -3, 3, -2, 2, 0],
              }
            : undefined
        }
        transition={{ duration: 0.4 }}
      >
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%)',
            backgroundSize: '200% 100%',
            animation: combo >= 5 ? 'shimmer 2s linear infinite' : undefined,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center gap-1.5">
          {IconComponent && (
            <m.div
              animate={
                combo >= 10
                  ? {
                      rotate: [0, -10, 10, 0],
                      scale: [1, 1.1, 1],
                    }
                  : undefined
              }
              transition={{
                duration: 0.5,
                repeat: combo >= 10 ? Infinity : 0,
                repeatDelay: 1,
              }}
            >
              <IconComponent className={cn(sizeConfig[size].icon, 'text-neo-black')} />
            </m.div>
          )}
          <span>{combo}x</span>
          {multiplier && multiplier > 1 && (
            <span className={cn('opacity-70', sizeConfig[size].multiplier)}>
              ({multiplier.toFixed(1)})
            </span>
          )}
        </div>
      </m.div>

      {/* +1 indicator */}
      <AnimatePresence>
        {showComboUp && (
          <m.div
            className="absolute -top-4 left-1/2 pointer-events-none"
            initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.8 }}
            animate={{ opacity: 1, y: -15, scale: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="font-black text-sm whitespace-nowrap"
              style={{
                color: intensity.glow,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              +1
            </span>
          </m.div>
        )}
      </AnimatePresence>

      {/* Intensity particles */}
      {shouldShowParticles && (
        <>
          {particleAngles.map((angle, i) => {
            const radians = (angle * Math.PI) / 180;
            return (
              <m.div
                key={`particle-${i}`}
                className="absolute w-2 h-2 border border-neo-black"
                style={{
                  left: '50%',
                  top: '50%',
                  backgroundColor: intensity.glow,
                  marginLeft: -4,
                  marginTop: -4,
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(radians) * 40,
                  y: Math.sin(radians) * 40,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                  rotate: 180,
                }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.03,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

// Add shimmer keyframes
if (typeof document !== 'undefined') {
  const styleId = 'combo-intensity-shimmer';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default ComboIntensityBadge;
