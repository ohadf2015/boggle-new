'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import type { ReferralMilestone } from '@/shared/types/socket';

interface ReferralMilestonePopupProps {
  isOpen: boolean;
  milestone: ReferralMilestone | null;
  onClose: () => void;
}

const MILESTONE_ICONS: Record<string, string> = {
  first_game_played: '1',
  five_games_played: '5',
  ten_games_played: '10',
};

const MILESTONE_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  first_game_played: {
    bg: 'from-green-500 to-emerald-600',
    text: 'text-green-400',
    glow: 'shadow-green-500/50',
  },
  five_games_played: {
    bg: 'from-blue-500 to-indigo-600',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/50',
  },
  ten_games_played: {
    bg: 'from-purple-500 to-pink-600',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/50',
  },
};

export function ReferralMilestonePopup({
  isOpen,
  milestone,
  onClose,
}: ReferralMilestonePopupProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Fire confetti on open
  React.useEffect(() => {
    if (isOpen && milestone) {
      triggerHaptic('success');

      // Delay confetti slightly for visual impact
      const timer = setTimeout(() => {
        fireConfetti({
          particleCount: 80,
          spread: 60,
          colors: ['#10B981', '#3B82F6', '#8B5CF6', '#FFD700'],
        });
      }, 300);

      return () => clearTimeout(timer);
    }
    return;
  }, [isOpen, milestone]);

  const handleClose = useCallback(() => {
    triggerHaptic('light');
    onClose();
  }, [onClose]);

  if (!milestone) return null;

  const colors = MILESTONE_COLORS[milestone.milestone] || MILESTONE_COLORS.first_game_played;
  const gameCount = MILESTONE_ICONS[milestone.milestone] || '1';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`fixed left-1/2 top-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 ${
              isDarkMode
                ? 'bg-neo-black border-neo-cream/30'
                : 'bg-neo-cream border-neo-black'
            } border-4 rounded-2xl overflow-hidden shadow-2xl ${colors.glow}`}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className={`absolute right-3 top-3 z-10 p-1.5 rounded-full transition-colors ${
                isDarkMode
                  ? 'hover:bg-white/10 text-neo-cream/70'
                  : 'hover:bg-black/10 text-neo-black/70'
              }`}
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with gradient */}
            <div className={`bg-gradient-to-br ${colors.bg} p-6 pb-8 text-center text-white`}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-3"
              >
                <Users className="w-10 h-10" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold"
              >
                {t('referral.milestoneTitle')}
              </motion.h2>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Friend name and milestone */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <p className={`text-lg ${isDarkMode ? 'text-neo-cream' : 'text-neo-black'}`}>
                  <span className="font-bold">{milestone.referredUsername}</span>
                  {' '}
                  {t(`referral.milestone_${milestone.milestone}`)}
                </p>
              </motion.div>

              {/* Game count badge */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${colors.bg} text-white text-2xl font-bold shadow-lg mb-4`}
              >
                {gameCount}
              </motion.div>

              {/* Reward */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`flex items-center justify-center gap-2 text-lg font-bold mb-4 ${colors.text}`}
              >
                <Gift className="w-5 h-5" />
                <span>+{milestone.rewardXp} XP</span>
                <Sparkles className="w-5 h-5" />
              </motion.div>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className={`text-sm ${isDarkMode ? 'text-neo-cream/70' : 'text-neo-black/70'}`}
              >
                {t('referral.milestoneMessage')}
              </motion.p>

              {/* Close button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-6"
              >
                <Button
                  onClick={handleClose}
                  className={`w-full bg-gradient-to-r ${colors.bg} text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity`}
                >
                  {t('common.awesome')}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ReferralMilestonePopup;
