'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Gift, Zap, Sparkles, Shield, Crown, Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarRewardCard, CalendarReward } from './CalendarRewardCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { fetchWithAuth, postWithAuth } from '@/utils/authFetch';

interface CalendarStatus {
  month: number;
  year: number;
  daysClaimed: number[];
  currentDay: number;
  canClaimToday: boolean;
  rewards: CalendarReward[];
}

interface CalendarRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
};

export function CalendarRewardsModal({ isOpen, onClose }: CalendarRewardsModalProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState<CalendarReward | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchCalendarStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setFetchError(null);
      const response = await fetchWithAuth('/api/engagement/calendar');
      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data);
      } else {
        // Handle HTTP errors (401, 500, etc.)
        console.error('[Calendar] API error:', response.status, response.statusText);
        setFetchError(response.status === 401 ? 'Session expired. Please refresh the page.' : 'Failed to load calendar. Please try again.');
      }
    } catch (error) {
      // Serialize error properly - Error objects don't stringify well
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Calendar] Error fetching status:', errorMessage);
      setFetchError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen) {
      if (user?.id) {
        fetchCalendarStatus();
      } else {
        // No user - stop loading and show login prompt
        setIsLoading(false);
      }
    }
  }, [isOpen, user?.id, fetchCalendarStatus]);

  const handleClaimReward = async () => {
    if (!calendarStatus?.canClaimToday || isClaiming) return;

    try {
      setIsClaiming(true);
      const response = await postWithAuth('/api/engagement/calendar');

      if (response.ok) {
        const data = await response.json();
        setClaimedReward(data.reward);

        // Update local state
        setCalendarStatus(prev => prev ? {
          ...prev,
          daysClaimed: [...prev.daysClaimed, prev.currentDay],
          canClaimToday: false,
        } : null);

        // Show success toast
        const rewardText = getRewardText(data.reward);
        toast.success(rewardText, {
          icon: '🎁',
          duration: 3000,
        });
      } else {
        toast.error(t('calendar.claimError') || 'Failed to claim reward');
      }
    } catch (error) {
      // Serialize error properly - Error objects don't stringify well
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Calendar] Error claiming reward:', errorMessage);
      toast.error(t('calendar.claimError') || 'Failed to claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  const getRewardText = (reward: CalendarReward): string => {
    switch (reward.type) {
      case 'xp':
        return `+${reward.amount} XP claimed!`;
      case 'hints':
        return `+${reward.amount} hints added!`;
      case 'streak_freeze':
        return `+${reward.amount} streak freeze!`;
      case 'mystery_box':
        return 'Mystery box opened!';
      case 'exclusive_title':
        return 'Exclusive title unlocked!';
      default:
        return 'Reward claimed!';
    }
  };

  const monthName = calendarStatus
    ? (MONTH_NAMES[language as keyof typeof MONTH_NAMES] || MONTH_NAMES.en)[calendarStatus.month - 1]
    : '';

  const daysInMonth = calendarStatus
    ? new Date(calendarStatus.year, calendarStatus.month, 0).getDate()
    : 31;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg p-0">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            {t('calendar.title') || 'Daily Rewards'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('calendar.description') || 'Claim daily rewards by playing regularly'}
          </DialogDescription>
        </DialogHeader>

        {/* Body with scroll */}
        <DialogBody className="p-3 sm:p-4 md:p-6">
          {/* Month header */}
          <div className="text-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-neo-navy uppercase">
              {monthName} {calendarStatus?.year}
            </h3>
            <p className="text-xs sm:text-sm text-neo-black/70">
              {t('calendar.claimedCount') || 'Claimed'}: {calendarStatus?.daysClaimed.length || 0}/{daysInMonth}
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <NeoLoader variant="mascot" size="sm" />
            </div>
          )}

          {/* Not logged in state */}
          {!isLoading && !user?.id && (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 mx-auto mb-3 text-neo-pink/50" />
              <h3 className="text-lg font-bold text-neo-black mb-2">
                {t('calendar.loginRequired') || 'Login Required'}
              </h3>
              <p className="text-sm text-neo-black/70 mb-4">
                {t('calendar.loginToClaimRewards') || 'Sign in to claim your daily rewards and track your progress!'}
              </p>
              <Button
                onClick={onClose}
                className="bg-neo-cyan text-neo-black font-bold uppercase text-sm py-2 px-4 border-2 border-neo-black shadow-hard hover:shadow-hard-lg"
              >
                {t('common.close') || 'Close'}
              </Button>
            </div>
          )}

          {/* Error state */}
          {!isLoading && user?.id && fetchError && (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 mx-auto mb-3 text-neo-pink/50" />
              <h3 className="text-lg font-bold text-neo-black mb-2">
                {t('calendar.loadError') || 'Oops!'}
              </h3>
              <p className="text-sm text-neo-black/70 mb-4">
                {fetchError}
              </p>
              <Button
                onClick={() => fetchCalendarStatus()}
                className="bg-neo-cyan text-neo-black font-bold uppercase text-sm py-2 px-4 border-2 border-neo-black shadow-hard hover:shadow-hard-lg"
              >
                {t('common.retry') || 'Try Again'}
              </Button>
            </div>
          )}

          {/* Calendar grid */}
          {!isLoading && calendarStatus && !fetchError && (
            <>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 mb-3 sm:mb-4">
                {calendarStatus.rewards.slice(0, daysInMonth).map((reward) => (
                  <CalendarRewardCard
                    key={reward.day}
                    reward={reward}
                    isClaimed={calendarStatus.daysClaimed.includes(reward.day)}
                    isToday={reward.day === calendarStatus.currentDay}
                    canClaim={reward.day === calendarStatus.currentDay && calendarStatus.canClaimToday}
                    isPast={reward.day < calendarStatus.currentDay}
                    onClaim={handleClaimReward}
                  />
                ))}
              </div>

              {/* Claim button for today */}
              {calendarStatus.canClaimToday && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 sm:mt-4"
                >
                  <Button
                    onClick={handleClaimReward}
                    disabled={isClaiming}
                    className="w-full max-w-btn bg-neo-lime text-neo-black font-black uppercase text-sm sm:text-base md:text-lg py-3 sm:py-4 border-2 sm:border-3 border-neo-black shadow-hard hover:shadow-hard-lg"
                  >
                    {isClaiming ? (
                      <NeoLoader variant="dots" size="sm" />
                    ) : (
                      <>
                        <Gift className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        {t('calendar.claimToday') || "Claim Today's Reward"}
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Already claimed message */}
              {!calendarStatus.canClaimToday && (
                <div className="mt-3 sm:mt-4 text-center py-2 sm:py-3 bg-neo-lime/10 rounded-neo border-2 border-neo-lime/30">
                  <p className="text-neo-lime font-bold uppercase text-xs sm:text-sm flex items-center justify-center gap-2">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t('calendar.alreadyClaimed') || "Today's reward claimed!"}
                  </p>
                  <p className="text-neo-black/60 text-[10px] sm:text-xs mt-1">
                    {t('calendar.comeBackTomorrow') || 'Come back tomorrow for more rewards'}
                  </p>
                </div>
              )}

              {/* Legend - collapsible on mobile */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-neo-black/20">
                <h4 className="text-[10px] sm:text-xs font-bold uppercase text-neo-black/70 mb-2">
                  {t('calendar.rewardTypes') || 'Reward Types'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-neo-black/80">
                    <Zap className="w-3 h-3 text-neo-lime flex-shrink-0" />
                    <span>XP Bonus</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-neo-black/80">
                    <Sparkles className="w-3 h-3 text-neo-cyan flex-shrink-0" />
                    <span>Free Hints</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-neo-black/80">
                    <Shield className="w-3 h-3 text-neo-lime flex-shrink-0" />
                    <span>Streak Freeze</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-neo-black/80">
                    <Gift className="w-3 h-3 text-neo-pink flex-shrink-0" />
                    <span>Mystery Box</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-neo-black/80">
                    <Crown className="w-3 h-3 text-neo-pink flex-shrink-0" />
                    <span>Exclusive Title</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-neo-black/80">
                    <Flame className="w-3 h-3 text-neo-lime flex-shrink-0" />
                    <span>Milestone</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default CalendarRewardsModal;
