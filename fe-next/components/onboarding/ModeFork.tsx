'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Users, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ModeForkProps {
  onSelectMode: (mode: 'daily' | 'practice' | 'home' | 'joinRoom') => void;
  hasPendingInvite?: boolean;
}

/**
 * ModeFork - Exactly 2 choices: Daily Challenge or Practice Mode.
 * Step 5 of the FTUE: The Fork (2-5min).
 * Everything else hidden. Focused decision.
 */
const ModeFork: React.FC<ModeForkProps> = ({ onSelectMode, hasPendingInvite }) => {
  const { t, dir } = useLanguage();

  return (
    <div
      data-testid="mode-fork"
      className="w-full max-w-sm mx-auto flex flex-col items-center gap-4"
      dir={dir}
    >
      {/* Join Friend's Game — shown only when user arrived via room invite link */}
      {hasPendingInvite && (
        <motion.button
          data-testid="join-room-button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 26 }}
          onClick={() => onSelectMode('joinRoom')}
          className={cn(
            'w-full p-5 bg-neo-pink border-3 border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed',
            'transition-all active:translate-y-[2px]',
            'flex items-center gap-4 text-start',
            'ring-2 ring-neo-yellow ring-offset-2 ring-offset-neo-navy'
          )}
        >
          <div className="w-12 h-12 bg-neo-orange border-2 border-neo-black rounded-neo flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-neo-white" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-neo-white text-lg uppercase">
              {t('onboarding.ftue.joinFriendsGame')}
            </div>
            <div className="text-neo-white/80 text-sm font-medium mt-0.5">
              {t('onboarding.ftue.joinFriendsGameDesc')}
            </div>
          </div>
        </motion.button>
      )}

      {/* Daily Challenge card */}
      <motion.button
        initial={{ x: -40, opacity: 0, rotate: -2 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ delay: hasPendingInvite ? 0.15 : 0.1, type: 'spring', stiffness: 300, damping: 22 }}
        whileHover={{ scale: 1.03, y: -3 }}
        whileTap={{ scale: 0.97, y: 2 }}
        onClick={() => onSelectMode('daily')}
        className={cn(
          'w-full p-5 bg-neo-yellow border-3 border-neo-black rounded-neo',
          'shadow-hard-sm',
          'flex items-center gap-4 text-start'
        )}
      >
        <motion.div
          className="w-12 h-12 bg-neo-orange border-2 border-neo-black rounded-neo flex items-center justify-center shrink-0"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ delay: 1.2, duration: 0.5, ease: 'easeInOut' }}
        >
          <Trophy className="w-7 h-7 text-neo-white" />
        </motion.div>
        <div className="min-w-0">
          <div className="font-black text-neo-black text-lg uppercase">
            {t('onboarding.ftue.dailyChallenge')}
          </div>
          <div className="text-neo-black/70 text-sm font-medium mt-0.5">
            {t('onboarding.ftue.dailyChallengeDesc')}
          </div>
        </div>
      </motion.button>

      {/* Practice Mode card */}
      <motion.button
        initial={{ x: 40, opacity: 0, rotate: 2 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ delay: hasPendingInvite ? 0.25 : 0.2, type: 'spring', stiffness: 300, damping: 22 }}
        whileHover={{ scale: 1.03, y: -3 }}
        whileTap={{ scale: 0.97, y: 2 }}
        onClick={() => onSelectMode('practice')}
        className={cn(
          'w-full p-5 bg-neo-cyan border-3 border-neo-black rounded-neo',
          'shadow-hard-sm',
          'flex items-center gap-4 text-start'
        )}
      >
        <motion.div
          className="w-12 h-12 bg-neo-navy border-2 border-neo-black rounded-neo flex items-center justify-center shrink-0"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ delay: 1.5, duration: 0.4, ease: 'easeInOut' }}
        >
          <Target className="w-7 h-7 text-neo-cyan" />
        </motion.div>
        <div className="min-w-0">
          <div className="font-black text-neo-black text-lg uppercase">
            {t('onboarding.ftue.practiceMode')}
          </div>
          <div className="text-neo-black/70 text-sm font-medium mt-0.5">
            {t('onboarding.ftue.practiceModeDesc')}
          </div>
        </div>
      </motion.button>

      {/* Explore All Modes card */}
      <motion.button
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: hasPendingInvite ? 0.35 : 0.3, type: 'spring', stiffness: 300, damping: 22 }}
        whileHover={{ scale: 1.03, y: -3 }}
        whileTap={{ scale: 0.97, y: 2 }}
        onClick={() => onSelectMode('home')}
        className={cn(
          'w-full p-5 bg-neo-navy border-3 border-neo-white/30 rounded-neo',
          'shadow-hard-sm',
          'flex items-center gap-4 text-start'
        )}
      >
        <div className="w-12 h-12 bg-neo-white/10 border-2 border-neo-white/30 rounded-neo flex items-center justify-center shrink-0">
          <Home className="w-7 h-7 text-neo-white" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-neo-white text-lg uppercase">
            {t('onboarding.ftue.homePage')}
          </div>
          <div className="text-neo-white/50 text-sm font-medium mt-0.5">
            {t('onboarding.ftue.homePageDesc')}
          </div>
        </div>
      </motion.button>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: hasPendingInvite ? 0.6 : 0.5 }}
        className="text-sm text-neo-white/60 font-bold text-center"
      >
        {t('onboarding.ftue.moreModesUnlock')}
      </motion.p>
    </div>
  );
};

export default ModeFork;
