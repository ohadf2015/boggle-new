'use client';

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/utils/confettiUtils';
import { Star, Trophy, Crown, Sparkles } from 'lucide-react';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';

interface LevelUpCelebrationProps {
  /** New level reached */
  level: number;
  /** Whether to show the celebration */
  show: boolean;
  /** Callback when celebration is dismissed */
  onDismiss?: () => void;
  /** Auto-dismiss after duration (ms). Set to 0 to disable */
  autoDismissAfter?: number;
  /** Rewards earned with level up */
  rewards?: {
    coins?: number;
    unlocks?: string[];
  };
  /** Additional className */
  className?: string;
}

/**
 * LevelUpCelebration - Epic level-up celebration sequence
 *
 * Uses GSAP for complex timeline animation:
 * 1. Screen flash
 * 2. Badge scale-in with rotation
 * 3. Level number reveal
 * 4. Particle burst
 * 5. Optional rewards display
 * 6. Confetti celebration
 *
 * @example
 * ```tsx
 * const [showLevelUp, setShowLevelUp] = useState(false);
 * const [newLevel, setNewLevel] = useState(1);
 *
 * const handleLevelUp = (level: number) => {
 *   setNewLevel(level);
 *   setShowLevelUp(true);
 * };
 *
 * <LevelUpCelebration
 *   level={newLevel}
 *   show={showLevelUp}
 *   onDismiss={() => setShowLevelUp(false)}
 *   rewards={{ coins: 100 }}
 * />
 * ```
 */
export function LevelUpCelebration({
  level,
  show,
  onDismiss,
  autoDismissAfter = 4000,
  rewards,
  className,
}: LevelUpCelebrationProps) {
  const { t } = useLanguage();
  const { isLowEnd, prefersReducedMotion, enableGlowEffects, enableComplexAnimations } =
    useDevicePerformance();
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<{ kill: () => void } | null>(null);
  const [phase, setPhase] = useState<'flash' | 'badge' | 'reveal' | 'rewards' | 'done'>('flash');

  // Get icon based on level milestone
  const LevelIcon = level >= 50 ? Crown : level >= 25 ? Trophy : level >= 10 ? Star : Sparkles;

  // GSAP Timeline Animation — dynamically imported to save ~30KB from initial bundle
  useEffect(() => {
    if (!show || !containerRef.current || prefersReducedMotion) return;

    const container = containerRef.current;
    let ctx: { revert: () => void } | null = null;

    import('gsap').then(({ default: gsap }) => {
      if (!container.isConnected) return; // Component unmounted during load

      ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setPhase('done');
          if (autoDismissAfter > 0 && onDismiss) {
            setTimeout(onDismiss, autoDismissAfter - 2500);
          }
        },
      });
      timelineRef.current = tl;

      // Phase 1: Flash
      tl.to('.level-flash', {
        opacity: 1,
        duration: 0.1,
        ease: 'power2.in',
      })
        .to('.level-flash', {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => setPhase('badge'),
        })
        // Phase 2: Badge entrance
        .from(
          '.level-badge',
          {
            scale: 0,
            rotation: -180,
            duration: 0.6,
            ease: 'back.out(1.7)',
          },
          '-=0.1'
        )
        // Phase 3: Level number
        .from(
          '.level-number',
          {
            scale: 0,
            opacity: 0,
            duration: 0.4,
            ease: 'back.out(2)',
            onComplete: () => {
              setPhase('reveal');
              // Fire confetti
              if (enableComplexAnimations) {
                fireConfetti();
                setTimeout(() => fireConfetti(), 300);
              }
            },
          },
          '-=0.2'
        )
        // Phase 4: Title
        .from(
          '.level-title',
          {
            y: 30,
            opacity: 0,
            duration: 0.4,
            ease: 'power2.out',
          },
          '-=0.1'
        )
        // Phase 5: Rewards (if any) - only animate if element exists
        if (rewards && (rewards.coins || rewards.unlocks?.length)) {
          tl.from(
            '.level-rewards',
            {
              y: 20,
              opacity: 0,
              duration: 0.4,
              ease: 'power2.out',
              onComplete: () => setPhase('rewards'),
            },
            '-=0.1'
          );
        } else {
          // No rewards, just set phase
          tl.call(() => setPhase('rewards'));
        }
        // Pulse the badge
        tl
        .to('.level-badge', {
          scale: 1.05,
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          ease: 'power1.inOut',
        });
    }, container);
    }); // end dynamic import

    return () => {
      ctx?.revert();
      timelineRef.current?.kill();
    };
  }, [show, prefersReducedMotion, enableComplexAnimations, autoDismissAfter, onDismiss, rewards]);

  // Auto dismiss
  useEffect(() => {
    if (!show || autoDismissAfter <= 0 || !onDismiss) return;
    const timer = setTimeout(onDismiss, autoDismissAfter);
    return () => clearTimeout(timer);
  }, [show, autoDismissAfter, onDismiss]);

  // Pixi particle burst bridge (replaces 8 framer-motion divs)
  useEffect(() => {
    if (!show) return;
    if (prefersReducedMotion || isLowEnd || !enableComplexAnimations) return;
    const el = badgeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    SharedFxApp.spawnBurst('level-up-burst', x, y);
  }, [show, prefersReducedMotion, isLowEnd, enableComplexAnimations]);

  // Reduced motion variant
  if (prefersReducedMotion && show) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-60 flex items-center justify-center bg-neo-black/80',
          className
        )}
        onClick={onDismiss}
      >
        <div className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-neo-lime text-neo-black border-4 border-neo-black flex items-center justify-center mb-4">
            <span className="text-4xl font-black text-neo-black">{level}</span>
          </div>
          <h2 className="text-2xl font-black text-neo-lime">
            {t('levelUp.title')}
          </h2>
          {rewards?.coins && (
            <p className="text-neo-white mt-2">+{rewards.coins} coins</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <m.div
          ref={containerRef}
          className={cn(
            'fixed inset-0 z-60 flex items-center justify-center',
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-neo-black/85 backdrop-blur-xs" />

          {/* Flash overlay */}
          <div
            className="level-flash absolute inset-0 bg-neo-lime opacity-0 pointer-events-none"
          />

          {/* Radial glow */}
          {enableGlowEffects && !isLowEnd && (
            <m.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                background: [
                  'radial-gradient(circle at center, rgba(255,225,53,0.2) 0%, transparent 50%)',
                  'radial-gradient(circle at center, rgba(255,225,53,0.4) 0%, transparent 60%)',
                  'radial-gradient(circle at center, rgba(255,225,53,0.2) 0%, transparent 50%)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}

          {/* Main content */}
          <div className="relative z-10 text-center px-4">
            {/* Badge container */}
            <div ref={badgeRef} className="level-badge relative inline-block mb-6">
              {/* Rotating ring */}
              {!isLowEnd && (
                <m.div
                  className="absolute inset-0 rounded-full border-4 border-dashed border-neo-lime/50"
                  style={{ margin: -8 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                />
              )}

              {/* Main badge */}
              <div
                className="w-28 h-28 rounded-full bg-linear-to-br from-amber-300 via-yellow-400 to-amber-500 border-4 border-neo-black shadow-hard flex items-center justify-center"
                style={{
                  boxShadow: enableGlowEffects
                    ? '6px 6px 0 black, 0 0 40px rgba(255,225,53,0.5)'
                    : '6px 6px 0 black',
                }}
              >
                {/* Icon background */}
                <div className="absolute inset-4 rounded-full bg-amber-600/30 flex items-center justify-center">
                  <LevelIcon className="w-10 h-10 text-amber-800/50" />
                </div>

                {/* Level number */}
                <span className="level-number relative z-10 text-5xl font-black text-neo-black drop-shadow-[0_2px_0_rgba(255,255,255,0.3)]">
                  {level}
                </span>
              </div>

              {/* Particle burst — dispatched via SharedFxApp.spawnBurst('level-up-burst') */}
            </div>

            {/* Title */}
            <h2 className="level-title text-3xl md:text-4xl font-black text-neo-lime mb-2 drop-shadow-[0_4px_0_black]">
              {t('levelUp.title')}
            </h2>

            <p className="level-title text-neo-white text-lg mb-4">
              {t('levelUp.reached', { level }) || `You reached level ${level}!`}
            </p>

            {/* Rewards */}
            {rewards && (rewards.coins || rewards.unlocks?.length) && (
              <div className="level-rewards space-y-2">
                {rewards.coins && (
                  <m.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-neo bg-linear-to-r from-amber-400 to-yellow-400 border-3 border-neo-black shadow-hard"
                    animate={
                      enableGlowEffects
                        ? {
                            boxShadow: [
                              '4px 4px 0 black',
                              '4px 4px 0 black, 0 0 15px rgba(255,225,53,0.5)',
                              '4px 4px 0 black',
                            ],
                          }
                        : undefined
                    }
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <span className="text-xl">💰</span>
                    <span className="font-black text-neo-black">
                      +{rewards.coins} {t('common.coins')}
                    </span>
                  </m.div>
                )}

                {rewards.unlocks?.map((unlock, i) => (
                  <m.div
                    key={unlock}
                    className="block text-neo-lime font-bold"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    🔓 {unlock}
                  </m.div>
                ))}
              </div>
            )}

            {/* Tap to continue */}
            <m.p
              className="text-neo-white text-sm mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              {t('common.tapToContinue')}
            </m.p>

            {/* Celebration Mascot - appears after reveal */}
            {phase !== 'flash' && phase !== 'badge' && (
              <div className="absolute bottom-8 right-8 sm:bottom-12 sm:right-12 pointer-events-none">
                <CelebrationMascotWithEntrance
                  variant="celebration"
                  size="md"
                  delay={0.8}
                  className="drop-shadow-lg"
                  clipBorder="none"
                />
              </div>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default LevelUpCelebration;
