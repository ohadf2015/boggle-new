'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Brain, Sparkles, X } from 'lucide-react';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

interface FirstGameCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  overallScore: number;
  tier: string;
  domains: {
    processingSpeed: number;
    workingMemory: number;
    attention: number;
    flexibility: number;
    vocabulary: number;
  };
}

/**
 * FirstGameCelebration Component
 *
 * Celebratory modal shown after completing the first brain training game.
 * Features confetti-like particles, animated score reveal, and encouraging messaging.
 */
export default function FirstGameCelebration({
  isOpen,
  onClose,
  overallScore,
  tier,
  domains
}: FirstGameCelebrationProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { playAchievementSound } = useSoundEffects();
  const isDarkMode = theme === 'dark';
  const [showConfetti, setShowConfetti] = useState(false);

  // Generate random values for confetti particles once on mount
  const [confettiValues] = useState(() =>
    Array.from({ length: 50 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      duration: 2 + Math.random()
    }))
  );

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Cheer + haptic so this milestone lands as a memory, not just visuals.
      playAchievementSound();
      // Stop confetti after 3 seconds
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, playAchievementSound]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in-0 duration-300"
        onClick={onClose}
      >
        {/* Confetti Particles */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiValues.map((values, i) => (
              <m.div
                key={`confetti-particle-${i}`}
                className={cn(
                  'absolute w-2 h-2 rounded-full',
                  i % 5 === 0 ? 'bg-neo-lime' :
                  i % 5 === 1 ? 'bg-neo-cyan' :
                  i % 5 === 2 ? 'bg-neo-purple' :
                  i % 5 === 3 ? 'bg-neo-green' :
                  'bg-neo-orange'
                )}
                initial={{
                  x: '50vw',
                  y: '50vh',
                  scale: 0.95,
                  rotate: 0
                }}
                animate={{
                  x: `${values.x}vw`,
                  y: `${values.y}vh`,
                  scale: [0, 1, 0.5],
                  rotate: values.rotation,
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: values.duration,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        )}

        {/* Modal Content */}
        <div
          className={cn(
            'relative max-w-md w-full rounded-neo border-4 border-neo-black shadow-hard-lg p-8 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className={cn(
              'absolute top-3 right-3 p-2 rounded-neo border-2 border-neo-black',
              'transition-all hover:translate-y-[-2px] hover:shadow-hard-sm',
              isDarkMode ? 'bg-neo-navy-elevated text-neo-white' : 'bg-neo-cream text-neo-black'
            )}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Animated Brain Icon */}
          <m.div
            className="flex justify-center mb-4"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-20 h-20 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black flex items-center justify-center">
              <Brain className="w-12 h-12 text-neo-black" />
            </div>
          </m.div>

          {/* Title */}
          <h2
            className={cn(
              'text-3xl font-black text-center mb-2 uppercase animate-in fade-in-0 zoom-in-95 duration-300',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}
            style={{ animationDelay: '0.2s' }}
          >
            {t('brain.firstGameComplete')}
          </h2>

          {/* Subtitle */}
          <p
            className={cn(
              'text-center mb-6 text-sm animate-in fade-in-0 duration-300',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
            )}
            style={{ animationDelay: '0.3s' }}
          >
            {t('brain.baselineEstablished')}
          </p>

          {/* Overall Score */}
          <div
            className={cn(
              'mb-6 p-4 rounded-neo border-3 border-neo-black text-center animate-in fade-in-0 zoom-in-95 duration-300',
              isDarkMode ? 'bg-neo-navy-elevated' : 'bg-neo-cream'
            )}
            style={{ animationDelay: '0.4s' }}
          >
            <p className={cn(
              'text-sm font-bold uppercase mb-1',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
            )}>
              {t('brain.overallScore')}
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span
                className={cn(
                  'text-5xl font-black animate-in fade-in-0 duration-300',
                  isDarkMode ? 'text-neo-lime' : 'text-emerald-600'
                )}
                style={{ animationDelay: '0.6s' }}
              >
                {overallScore}
              </span>
              <span className={cn(
                'text-2xl font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
              )}>
                /100
              </span>
            </div>
            <p className={cn(
              'text-xs font-bold uppercase mt-1',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t(`brain.tiers.${tier}`)}
            </p>
          </div>

          {/* Domain Scores Preview */}
          <div
            className="space-y-2 mb-6 animate-in fade-in-0 zoom-in-95 duration-300"
            style={{ animationDelay: '0.7s' }}
          >
            {Object.entries(domains).map(([key, value], index) => (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between p-2 rounded-neo border-2 border-neo-black animate-in fade-in-0 zoom-in-95 duration-300',
                  isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-white'
                )}
                style={{ animationDelay: `${0.8 + index * 0.05}s` }}
              >
                <span className={cn(
                  'text-xs font-bold',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}>
                  {t(`brain.domains.${key}`)}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-black',
                    isDarkMode ? 'text-neo-white' : 'text-neo-black'
                  )}>
                    {value}
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-neo-black bg-neo-lime text-neo-black">
                    <Sparkles className="w-2.5 h-2.5 text-neo-black" />
                    <span className="text-[9px] font-black text-neo-black uppercase">
                      {t('brain.newBadge')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div
            className={cn(
              'p-4 rounded-neo border-2 border-neo-black text-center animate-in fade-in-0 zoom-in-95 duration-300',
              'bg-linear-to-r from-neo-lime to-lime-400'
            )}
            style={{ animationDelay: '1.2s' }}
          >
            <p className="text-sm font-bold text-neo-black mb-2">
              🔥 {t('brain.playMoreForTrends', { count: 2 })}
            </p>
            <button
              onClick={onClose}
              className={cn(
                'w-full px-6 py-3 rounded-neo font-black uppercase',
                'border-3 border-neo-black shadow-hard',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('brain.playAgain')}
            </button>
          </div>

          {/* Celebration Mascot - positioned at corner */}
          <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 pointer-events-none z-10">
            <CelebrationMascotWithEntrance
              variant="celebration"
              size="sm"
              delay={1.0}
              className="drop-shadow-lg"
              clipBorder="none"
            />
          </div>
        </div>
      </div>
    </>
  );
}
