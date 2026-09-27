'use client';

import React, { useCallback } from 'react';
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

  // CSS entrances (animate-in) instead of framer-motion: a starved main thread —
  // e.g. while the large Hebrew bundle parses — would leave a framer-motion
  // `initial` opacity:0 pinned, so the user sees only the dark backdrop ("black
  // screen"). CSS runs off the main thread and always settles visible.
  return (
    isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-300"
            onClick={handleClose}
          />

          {/* Popup */}
          <div
            className={`fixed left-1/2 top-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 duration-300 ${
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
                  ? 'hover:bg-white/10 text-neo-white'
                  : 'hover:bg-black/10 text-neo-black/70'
              }`}
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with gradient */}
            <div className={`bg-linear-to-br ${colors.bg} p-6 pb-8 text-center text-white`}>
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-xs mb-3 animate-in zoom-in-50 duration-300"
              >
                <Users className="w-10 h-10" />
              </div>

              <h2 className="text-xl font-bold animate-in fade-in-0 duration-300">
                {t('referral.milestoneTitle')}
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Friend name and milestone */}
              <div className="mb-4 animate-in fade-in-0 duration-300">
                <p className={`text-lg ${isDarkMode ? 'text-neo-white' : 'text-neo-black'}`}>
                  <span className="font-bold">{milestone.referredUsername}</span>
                  {' '}
                  {t(`referral.milestone_${milestone.milestone}`)}
                </p>
              </div>

              {/* Game count badge */}
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br ${colors.bg} text-white text-2xl font-bold shadow-lg mb-4 animate-in zoom-in-50 duration-300`}
              >
                {gameCount}
              </div>

              {/* Reward */}
              <div
                className={`flex items-center justify-center gap-2 text-lg font-bold mb-4 animate-in fade-in-0 duration-300 ${colors.text}`}
              >
                <Gift className="w-5 h-5" />
                <span>+{milestone.rewardXp} XP</span>
                <Sparkles className="w-5 h-5" />
              </div>

              {/* Message */}
              <p
                className={`text-sm animate-in fade-in-0 duration-300 ${isDarkMode ? 'text-neo-white' : 'text-neo-black/70'}`}
              >
                {t('referral.milestoneMessage')}
              </p>

              {/* Close button */}
              <div className="mt-6 animate-in fade-in-0 duration-300">
                <Button
                  onClick={handleClose}
                  className={`w-full bg-linear-to-r ${colors.bg} text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity`}
                >
                  {t('common.awesome')}
                </Button>
              </div>
            </div>
          </div>
        </>
      )
  );
}

export default ReferralMilestonePopup;
