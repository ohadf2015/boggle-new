'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ModeForkProps {
  onSelectMode: (mode: 'daily' | 'practice') => void;
}

/**
 * ModeFork - Exactly 2 choices: Daily Challenge or Practice Mode.
 * Step 5 of the FTUE: The Fork (2-5min).
 * Everything else hidden. Focused decision.
 */
const ModeFork: React.FC<ModeForkProps> = ({ onSelectMode }) => {
  const { t, dir } = useLanguage();

  return (
    <div
      data-testid="mode-fork"
      className="w-full max-w-sm mx-auto flex flex-col items-center gap-4"
      dir={dir}
    >
      {/* Daily Challenge card */}
      <motion.button
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
        onClick={() => onSelectMode('daily')}
        className={cn(
          'w-full p-5 bg-neo-yellow border-3 border-neo-black rounded-neo',
          'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed',
          'transition-all active:translate-y-[2px]',
          'flex items-center gap-4 text-start'
        )}
      >
        <div className="w-12 h-12 bg-neo-orange border-2 border-neo-black rounded-neo flex items-center justify-center shrink-0">
          <Trophy className="w-7 h-7 text-neo-white" />
        </div>
        <div>
          <div className="font-black text-neo-black text-lg uppercase">
            {t('onboarding.ftue.dailyChallenge')}
          </div>
        </div>
      </motion.button>

      {/* Practice Mode card */}
      <motion.button
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
        onClick={() => onSelectMode('practice')}
        className={cn(
          'w-full p-5 bg-neo-cyan border-3 border-neo-black rounded-neo',
          'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed',
          'transition-all active:translate-y-[2px]',
          'flex items-center gap-4 text-start'
        )}
      >
        <div className="w-12 h-12 bg-neo-navy border-2 border-neo-black rounded-neo flex items-center justify-center shrink-0">
          <Target className="w-7 h-7 text-neo-cyan" />
        </div>
        <div>
          <div className="font-black text-neo-black text-lg uppercase">
            {t('onboarding.ftue.practiceMode')}
          </div>
        </div>
      </motion.button>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-neo-white/60 font-bold text-center"
      >
        {t('onboarding.ftue.moreModesUnlock')}
      </motion.p>
    </div>
  );
};

export default ModeFork;
