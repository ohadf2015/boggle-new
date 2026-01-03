'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Gift, Zap, Sparkles, Shield, Crown, Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarRewardCard, CalendarReward } from './CalendarRewardCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

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

  const fetchCalendarStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/engagement/calendar');
      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data);
      }
    } catch (error) {
      console.error('[Calendar] Error fetching status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCalendarStatus();
    }
  }, [isOpen, user?.id, fetchCalendarStatus]);

  const handleClaimReward = async () => {
    if (!calendarStatus?.canClaimToday || isClaiming) return;

    try {
      setIsClaiming(true);
      const response = await fetch('/api/engagement/calendar', {
        method: 'POST',
      });

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
      console.error('[Calendar] Error claiming reward:', error);
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
      <DialogContent className="bg-neo-navy border-3 border-neo-black shadow-hard-lg max-w-md sm:max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-black uppercase text-neo-cream flex items-center gap-2">
            <Calendar className="w-6 h-6 text-neo-yellow" />
            {t('calendar.title') || 'Daily Rewards'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-neo-cream hover:text-neo-yellow"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        {/* Month header */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-neo-cyan uppercase">
            {monthName} {calendarStatus?.year}
          </h3>
          <p className="text-sm text-neo-cream/70">
            {t('calendar.claimedCount') || 'Claimed'}: {calendarStatus?.daysClaimed.length || 0}/{daysInMonth}
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-neo-cyan border-t-transparent rounded-full" />
          </div>
        )}

        {/* Calendar grid */}
        {!isLoading && calendarStatus && (
          <>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-4">
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
                className="mt-4"
              >
                <Button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className="w-full bg-neo-yellow text-neo-black font-black uppercase text-lg py-4 border-3 border-neo-black shadow-hard hover:shadow-hard-lg"
                >
                  {isClaiming ? (
                    <div className="animate-spin w-5 h-5 border-2 border-neo-black border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      {t('calendar.claimToday') || "Claim Today's Reward"}
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Already claimed message */}
            {!calendarStatus.canClaimToday && (
              <div className="mt-4 text-center py-3 bg-neo-gray/30 rounded-neo border-2 border-neo-lime/30">
                <p className="text-neo-lime font-bold uppercase text-sm flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('calendar.alreadyClaimed') || "Today's reward claimed!"}
                </p>
                <p className="text-neo-cream/60 text-xs mt-1">
                  {t('calendar.comeBackTomorrow') || 'Come back tomorrow for more rewards'}
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-neo-cream/20">
              <h4 className="text-xs font-bold uppercase text-neo-cream/70 mb-2">
                {t('calendar.rewardTypes') || 'Reward Types'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-neo-cream/80">
                  <Zap className="w-3 h-3 text-neo-yellow" />
                  <span>XP Bonus</span>
                </div>
                <div className="flex items-center gap-1.5 text-neo-cream/80">
                  <Sparkles className="w-3 h-3 text-neo-cyan" />
                  <span>Free Hints</span>
                </div>
                <div className="flex items-center gap-1.5 text-neo-cream/80">
                  <Shield className="w-3 h-3 text-neo-lime" />
                  <span>Streak Freeze</span>
                </div>
                <div className="flex items-center gap-1.5 text-neo-cream/80">
                  <Gift className="w-3 h-3 text-neo-purple" />
                  <span>Mystery Box</span>
                </div>
                <div className="flex items-center gap-1.5 text-neo-cream/80">
                  <Crown className="w-3 h-3 text-neo-pink" />
                  <span>Exclusive Title</span>
                </div>
                <div className="flex items-center gap-1.5 text-neo-cream/80">
                  <Flame className="w-3 h-3 text-neo-orange" />
                  <span>Milestone</span>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CalendarRewardsModal;
