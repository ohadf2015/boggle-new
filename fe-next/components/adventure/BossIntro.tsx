/**
 * BossIntro Component
 *
 * Pre-battle boss introduction cutscene displayed before a boss level starts.
 * Shows the boss character with a dramatic entrance animation, their name,
 * twist mechanic description, and a start taunt.
 */

'use client';

import { memo, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';
import { Mascot } from '@/components/ui/Mascot';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { BossIntroProps } from '@/types/boss';

// ==============================================
// COMPONENT
// ==============================================

const BossIntro = memo<BossIntroProps>(({ boss, worldNumber: _worldNumber, onStart, onSkip }) => {
  const { t } = useLanguage();
  const bossFightTheme = useBossFightTheme();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true, onSkip);

  const bossName = t(boss.displayName);
  const mechanicDescription = t(boss.twistMechanic.description);
  const startTaunt = boss.taunts.onStart.length > 0
    ? t(boss.taunts.onStart[0])
    : '';

  return (
    <AdaptiveAnimatePresence>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="boss-intro-title"
        className={cn(
          'fixed inset-0 z-50',
          'flex items-center justify-center',
          'bg-neo-black/90 backdrop-blur-md'
        )}
      >
        {/* Modal Content */}
        <AdaptiveMotion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={cn(
            'relative w-full max-w-md mx-4',
            'bg-neo-navy border-4 border-neo-black',
            'rounded-neo shadow-hard-lg',
            'p-6 md:p-8',
            'flex flex-col items-center'
          )}
        >
          {/* Boss Battle Heading */}
          <AdaptiveMotion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
            className={cn(
              'text-center text-2xl md:text-3xl font-black',
              'text-neo-yellow mb-4',
              'uppercase tracking-wider',
              'drop-shadow-[0_0_10px_rgba(255,225,53,0.6)]'
            )}
          >
            {t('adventure.bosses.bossIntro')}
          </AdaptiveMotion.h1>

          {/* Boss Image with dramatic reveal + scared mascot */}
          <div className="relative mb-4">
            {/* Danger glow behind boss portrait */}
            <AdaptiveMotion.div
              className="absolute -inset-3 rounded-neo blur-md"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.6, 0.4], scale: 1 }}
              transition={{ delay: 0.15, duration: 1, ease: 'easeOut' }}
              style={{ background: bossFightTheme.avatarGlow }}
              aria-hidden="true"
            />
            <AdaptiveMotion.div
              initial={{ scale: 0, rotate: -10, y: 30 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 14, mass: 1.2 }}
              className={cn(
                'relative w-40 h-40 md:w-48 md:h-48',
                'border-neo-thick border-neo-black',
                'rounded-neo shadow-hard-lg',
                'overflow-hidden bg-neo-navy/50'
              )}
              style={{ boxShadow: `0 0 20px ${bossFightTheme.avatarGlow}` }}
            >
              <AdaptiveMotion.img
                src={boss.imagePath}
                alt={bossName}
                className="w-full h-full object-cover"
                initial={{ scale: 1.3, filter: 'brightness(0)' }}
                animate={{ scale: 1, filter: 'brightness(1)' }}
                transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </AdaptiveMotion.div>
            {/* Scared mascot bounces in from bottom-right */}
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: [0, 1.2, 0.9, 1], opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-2 -right-4"
            >
              <Mascot variant="scared" size="sm" />
            </AdaptiveMotion.div>
          </div>

          {/* Boss Name */}
          <AdaptiveMotion.h1
            id="boss-intro-title"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
            className={cn(
              'text-center text-xl md:text-2xl font-black',
              bossFightTheme.bossNameColor,
              'mb-2'
            )}
          >
            {bossName}
          </AdaptiveMotion.h1>

          {/* Storyline Text */}
          {boss.storylineIntro && (
            <AdaptiveMotion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className={cn(
                'w-full p-3 mb-3 rounded-neo',
                'bg-neo-cyan/5 border-2 border-neo-cyan/20',
                'text-center'
              )}
            >
              <p className="text-neo-white text-xs md:text-sm italic leading-relaxed">
                {t(boss.storylineIntro)}
              </p>
            </AdaptiveMotion.div>
          )}

          {/* Twist Mechanic Section */}
          <AdaptiveMotion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              'w-full p-3 mb-4 rounded-neo',
              'bg-neo-orange/10 border-2 border-neo-orange/40',
              'text-center'
            )}
          >
            <p className="text-neo-orange text-xs font-bold uppercase tracking-wider mb-1">
              {t('adventure.bosses.twistMechanic')}
            </p>
            <p className="text-neo-white font-bold text-sm md:text-base">
              {mechanicDescription}
            </p>
          </AdaptiveMotion.div>

          {/* Start Taunt */}
          {startTaunt && (
            <AdaptiveMotion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={cn(
                'text-center text-neo-white italic font-bold',
                'text-sm md:text-base mb-6',
                'px-4'
              )}
            >
              &ldquo;{startTaunt}&rdquo;
            </AdaptiveMotion.p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            {/* Fight Button */}
            <AdaptiveMotion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 20 }}
            >
              <button
                onClick={onStart}
                className={cn(
                  'w-full py-3 px-4',
                  'bg-neo-lime text-neo-black',
                  'font-black text-lg',
                  'border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  'transition-all duration-200'
                )}
              >
                {t('adventure.bosses.readyToFight')}
              </button>
            </AdaptiveMotion.div>

            {/* Skip Button */}
            <AdaptiveMotion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <button
                onClick={onSkip}
                className={cn(
                  'w-full py-2 px-4',
                  'bg-transparent text-neo-white',
                  'font-bold text-base',
                  'hover:text-neo-white hover:bg-neo-white/5',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
                  'rounded-neo transition-all duration-200'
                )}
              >
                {t('adventure.bosses.skipIntro')}
              </button>
            </AdaptiveMotion.div>
          </div>
        </AdaptiveMotion.div>
      </div>
    </AdaptiveAnimatePresence>
  );
});

BossIntro.displayName = 'BossIntro';

export default BossIntro;
