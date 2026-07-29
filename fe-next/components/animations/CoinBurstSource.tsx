'use client';

import { useEffect, useCallback, useReducer } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface SparkleParticle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: string;
}

interface CoinBurstSourceProps {
  /** Trigger the burst animation */
  trigger: boolean;
  /** Position of the burst center */
  position: { x: number; y: number };
  /** Amount to display in the center */
  amount?: number;
  /** Callback when burst animation starts */
  onBurstStart?: () => void;
  /** Callback when burst animation completes */
  onBurstComplete?: () => void;
  /** Burst intensity (affects particle count and size) */
  intensity?: 'low' | 'medium' | 'high';
  /** Show the amount badge in center */
  showAmount?: boolean;
  /** Additional className */
  className?: string;
}

const GOLD_COLORS = [
  '#FFE135', // neo-yellow
  '#FBBF24', // amber-400
  '#F59E0B', // amber-500
  '#FFD700', // gold
  '#FFC107', // yellow
];

/**
 * CoinBurstSource - Radial burst effect when coins are awarded
 *
 * Creates a satisfying visual explosion at the source of coin rewards:
 * - Central amount badge with scale animation
 * - Radial sparkle particles
 * - Golden ring expansion
 * - Performance-optimized for all devices
 *
 * @example
 * ```tsx
 * const [showBurst, setShowBurst] = useState(false);
 *
 * <CoinBurstSource
 *   trigger={showBurst}
 *   position={{ x: 200, y: 300 }}
 *   amount={10}
 *   intensity="high"
 *   onBurstComplete={() => setShowBurst(false)}
 * />
 * ```
 */
export function CoinBurstSource({
  trigger,
  position,
  amount,
  onBurstStart,
  onBurstComplete,
  intensity = 'medium',
  showAmount = true,
  className,
}: CoinBurstSourceProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects, maxParticles } = useDevicePerformance();
  // Batch isActive + particles — they always change together on burst start/end
  type BurstState = { isActive: boolean; particles: SparkleParticle[] };
  type BurstAction = { type: 'start'; particles: SparkleParticle[] } | { type: 'end' };
  const [burstState, dispatchBurst] = useReducer(
    (state: BurstState, action: BurstAction): BurstState => {
      switch (action.type) {
        case 'start': return { isActive: true, particles: action.particles };
        case 'end': return { isActive: false, particles: [] };
        default: return state;
      }
    },
    { isActive: false, particles: [] }
  );
  const { isActive, particles } = burstState;

  // Particle counts based on intensity and device capability
  const getParticleCount = useCallback(() => {
    const base = { low: 6, medium: 12, high: 20 }[intensity];
    return Math.min(base, isLowEnd ? 4 : maxParticles);
  }, [intensity, isLowEnd, maxParticles]);

  // Generate particles when triggered — dispatch batches isActive + particles in one update
  useEffect(() => {
    if (trigger && !isActive) {
      const count = getParticleCount();
      const newParticles: SparkleParticle[] = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        angle: (360 / count) * i + (Math.random() - 0.5) * 20,
        distance: 40 + Math.random() * 60,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.1,
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      }));

      dispatchBurst({ type: 'start', particles: newParticles });
      onBurstStart?.();

      // Auto-cleanup after animation
      const timer = setTimeout(() => {
        dispatchBurst({ type: 'end' });
        onBurstComplete?.();
      }, 800);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, isActive, getParticleCount, onBurstStart, onBurstComplete]);

  // Skip for reduced motion
  if (prefersReducedMotion) {
    if (trigger && showAmount && amount !== undefined) {
      return (
        <div
          className={cn('fixed pointer-events-none z-60', className)}
          style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="px-4 py-2 rounded-neo bg-neo-lime border-3 border-neo-black shadow-hard">
            <span className="font-black text-neo-black text-xl">+{amount}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  if (!isActive) return null;

  return (
    <div
      className={cn('fixed pointer-events-none z-60', className)}
      style={{ left: position.x, top: position.y }}
    >
      {/* Expanding ring effect */}
      {enableGlowEffects && !isLowEnd && (
        <>
          <m.div
            className="absolute rounded-full border-4 border-neo-lime"
            style={{
              left: '50%',
              top: '50%',
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
          <m.div
            className="absolute rounded-full border-2 border-amber-400"
            style={{
              left: '50%',
              top: '50%',
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
          />
        </>
      )}

      {/* Central glow */}
      {enableGlowEffects && !isLowEnd && (
        <m.div
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            width: 60,
            height: 60,
            marginLeft: -30,
            marginTop: -30,
            background: 'radial-gradient(circle, rgba(255,225,53,0.6) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Amount badge */}
      {showAmount && amount !== undefined && (
        <m.div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, rotate: -10 }}
          animate={{
            scale: [0, 1.3, 1],
            rotate: [-10, 5, 0],
          }}
          transition={{
            duration: 0.4,
            times: [0, 0.6, 1],
            ease: 'backOut',
          }}
        >
          <div className="px-4 py-2 rounded-neo-lg bg-linear-to-br from-amber-300 via-yellow-400 to-amber-500 border-3 border-neo-black shadow-hard whitespace-nowrap">
            <m.span
              className="font-black text-neo-black text-xl flex items-center gap-1.5"
              animate={{
                textShadow: enableGlowEffects
                  ? ['0 0 0 transparent', '0 0 10px rgba(255,225,53,0.5)', '0 0 0 transparent']
                  : undefined,
              }}
              transition={{ duration: 0.6 }}
            >
              <span>💰</span>
              <span>+{amount}</span>
            </m.span>
          </div>
        </m.div>
      )}

      {/* Sparkle particles */}
      <AnimatePresence>
        {particles.map((particle) => {
          const radians = (particle.angle * Math.PI) / 180;
          const endX = Math.cos(radians) * particle.distance;
          const endY = Math.sin(radians) * particle.distance;

          return (
            <m.div
              key={particle.id}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                width: particle.size,
                height: particle.size,
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: endX,
                y: endY,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 0.5,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            >
              {/* Neo-brutalist square particles */}
              <div
                className="w-full h-full border-2 border-neo-black shadow-[2px_2px_0_black]"
                style={{
                  backgroundColor: particle.color,
                  transform: `rotate(${particle.angle}deg)`,
                }}
              />
            </m.div>
          );
        })}
      </AnimatePresence>

      {/* Coin emoji burst */}
      {!isLowEnd && (
        <AnimatePresence>
          {[0, 1, 2].map((i) => {
            const angle = (120 * i + 30) * (Math.PI / 180);
            return (
              <m.div
                key={`coin-${i}`}
                className="absolute text-xl"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -12,
                  marginTop: -12,
                }}
                initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                animate={{
                  x: Math.cos(angle) * 50,
                  y: Math.sin(angle) * 50,
                  scale: [0, 1.2, 0],
                  rotate: 360,
                }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
              >
                🪙
              </m.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

export default CoinBurstSource;
