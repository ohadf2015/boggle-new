'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Gift, Sparkles, Zap, Shield, Crown, Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CalendarReward {
  day: number;
  type: 'xp' | 'hints' | 'streak_freeze' | 'mystery_box' | 'exclusive_title';
  amount?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  titleId?: string;
  isMilestone?: boolean;
}

interface CalendarRewardCardProps {
  reward: CalendarReward;
  isClaimed: boolean;
  isToday: boolean;
  canClaim: boolean;
  isPast: boolean;
  onClaim?: () => void;
}

const rarityColors = {
  common: 'from-neo-gray to-neo-navy-light',
  rare: 'from-neo-cyan to-neo-navy-light',
  epic: 'from-neo-pink to-neo-pink',
  legendary: 'from-neo-lime to-neo-lime',
};

const rarityBorders = {
  common: 'border-neo-gray',
  rare: 'border-neo-cyan',
  epic: 'border-neo-pink',
  legendary: 'border-neo-lime',
};

const rarityGlows = {
  common: '',
  rare: 'shadow-[0_0_10px_rgba(0,255,255,0.3)]',
  epic: 'shadow-[0_0_15px_rgba(139,92,246,0.4)]',
  legendary: 'shadow-[0_0_20px_rgba(255,225,53,0.5)]',
};

function getRewardIcon(type: CalendarReward['type'], rarity?: string) {
  const iconClass = "w-3 h-3 sm:w-4 sm:h-4";
  switch (type) {
    case 'xp':
      return <Zap className={cn(iconClass, "text-neo-lime")} />;
    case 'hints':
      return <Sparkles className={cn(iconClass, "text-neo-cyan")} />;
    case 'streak_freeze':
      return <Shield className={cn(iconClass, "text-neo-lime")} />;
    case 'mystery_box':
      return <Gift className={cn(iconClass, rarity === 'legendary' ? 'text-neo-lime' : rarity === 'epic' ? 'text-neo-pink' : rarity === 'rare' ? 'text-neo-cyan' : 'text-neo-black')} />;
    case 'exclusive_title':
      return <Crown className={cn(iconClass, "text-neo-pink")} />;
    default:
      return <Gift className={cn(iconClass, "text-neo-black")} />;
  }
}

function getRewardLabel(reward: CalendarReward): string {
  switch (reward.type) {
    case 'xp':
      return `+${reward.amount} XP`;
    case 'hints':
      return `+${reward.amount} Hints`;
    case 'streak_freeze':
      return `+${reward.amount} Freeze`;
    case 'mystery_box':
      return 'Mystery';
    case 'exclusive_title':
      return 'Title!';
    default:
      return 'Reward';
  }
}

export function CalendarRewardCard({
  reward,
  isClaimed,
  isToday,
  canClaim,
  isPast,
  onClaim,
}: CalendarRewardCardProps) {
  const rarity = reward.rarity || 'common';
  const isMilestone = reward.isMilestone;

  return (
    <m.button
      onClick={canClaim ? onClaim : undefined}
      disabled={!canClaim}
      className={cn(
        "relative flex flex-col items-center justify-center p-1 sm:p-2 rounded-neo border transition-all",
        "min-h-[42px] sm:min-h-[56px] md:min-h-[70px]",
        "border sm:border-2",
        // Base styles
        isClaimed && "bg-neo-lime/20 border-neo-lime",
        !isClaimed && !isPast && !isToday && "bg-neo-cream/50 border-neo-black/40",
        isPast && !isClaimed && "bg-neo-black/10 border-neo-black/30 opacity-50",
        // Today styles
        isToday && canClaim && [
          "bg-linear-to-br",
          rarityColors[rarity],
          rarityBorders[rarity],
          rarityGlows[rarity],
          "cursor-pointer hover:scale-105 hover:shadow-hard",
          "animate-pulse",
        ],
        isToday && !canClaim && "bg-neo-lime/20 border-neo-lime/50",
        // Milestone styles
        isMilestone && !isClaimed && !isPast && "border-neo-lime",
      )}
      whileTap={canClaim ? { scale: 0.95 } : undefined}
    >
      {/* Day number */}
      <span className={cn(
        "text-[10px] sm:text-xs font-bold absolute top-0.5 sm:top-1 left-1 sm:left-1.5",
        isClaimed ? "text-neo-black/70" : "text-neo-black",
        isToday && "text-neo-black font-black",
      )}>
        {reward.day}
      </span>

      {/* Status indicator */}
      {isClaimed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-neo-lime" />
        </div>
      )}

      {isPast && !isClaimed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-neo-black/60" />
        </div>
      )}

      {/* Reward content (hidden when claimed) */}
      {!isClaimed && !isPast && (
        <div className="flex flex-col items-center gap-0 sm:gap-0.5 mt-1.5 sm:mt-2">
          {getRewardIcon(reward.type, reward.rarity)}
          <span className={cn(
            "text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase leading-tight text-center",
            isToday ? "text-neo-black" : "text-neo-black",
          )}>
            {getRewardLabel(reward)}
          </span>
        </div>
      )}

      {/* Milestone indicator */}
      {isMilestone && !isClaimed && (
        <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-neo-lime rounded-full border border-neo-black" />
      )}

      {/* Today badge */}
      {isToday && (
        <div className="absolute -bottom-0.5 sm:-bottom-1 left-1/2 -translate-x-1/2 bg-neo-lime text-neo-black text-[6px] sm:text-[8px] font-black px-1 sm:px-1.5 py-0 sm:py-0.5 rounded-neo border border-neo-black whitespace-nowrap">
          TODAY
        </div>
      )}
    </m.button>
  );
}

export default CalendarRewardCard;
