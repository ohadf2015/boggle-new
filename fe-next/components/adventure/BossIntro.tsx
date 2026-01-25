/**
 * BossIntro Component
 *
 * Pre-battle boss introduction cutscene displayed before a boss level starts.
 * Shows the boss character with a dramatic entrance animation, their name,
 * twist mechanic description, and a start taunt.
 */

'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BossIntroProps } from '@/types/boss';

// ==============================================
// COMPONENT
// ==============================================

const BossIntro = memo<BossIntroProps>(({ boss, worldNumber, onStart, onSkip }) => {
  const { t } = useLanguage();

  const bossName = t(boss.displayName);
  const mechanicDescription = t(boss.twistMechanic.description);
  const startTaunt = boss.taunts.onStart.length > 0
    ? t(boss.taunts.onStart[0])
    : '';

  return (
    <AnimatePresence>
      <div
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
        <motion.div
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
          <motion.h1
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
          </motion.h1>

          {/* Boss Image */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 14 }}
            className={cn(
              'w-40 h-40 md:w-48 md:h-48 mb-4',
              'border-neo-thick border-neo-black',
              'rounded-neo shadow-hard-lg',
              'overflow-hidden bg-neo-navy/50'
            )}
          >
            <motion.img
              src={boss.imagePath}
              alt={bossName}
              className="w-full h-full object-cover"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
            />
          </motion.div>

          {/* Boss Name */}
          <motion.h1
            id="boss-intro-title"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
            className={cn(
              'text-center text-xl md:text-2xl font-black',
              'text-neo-white mb-2'
            )}
          >
            {bossName}
          </motion.h1>

          {/* Twist Mechanic Section */}
          <motion.div
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
          </motion.div>

          {/* Start Taunt */}
          {startTaunt && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={cn(
                'text-center text-neo-white/80 italic font-bold',
                'text-sm md:text-base mb-6',
                'px-4'
              )}
            >
              &ldquo;{startTaunt}&rdquo;
            </motion.p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            {/* Fight Button */}
            <motion.div
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
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  'transition-all duration-200'
                )}
              >
                {t('adventure.bosses.readyToFight')}
              </button>
            </motion.div>

            {/* Skip Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <button
                onClick={onSkip}
                className={cn(
                  'w-full py-2 px-4',
                  'bg-transparent text-neo-white/60',
                  'font-bold text-base',
                  'hover:text-neo-white hover:bg-neo-white/5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime',
                  'rounded-neo transition-all duration-200'
                )}
              >
                {t('adventure.bosses.skipIntro')}
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

BossIntro.displayName = 'BossIntro';

export default BossIntro;
