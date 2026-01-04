'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
  legendary: 'from-neo-yellow to-neo-yellow',
};

const rarityBorders = {
  common: 'border-neo-gray',
  rare: 'border-neo-cyan',
  epic: 'border-neo-pink',
  legendary: 'border-neo-yellow',
};

const rarityGlows = {
  common: '',
  rare: 'shadow-[0_0_10px_rgba(0,255,255,0.3)]',
  epic: 'shadow-[0_0_15px_rgba(139,92,246,0.4)]',
  legendary: 'shadow-[0_0_20px_rgba(255,225,53,0.5)]',
};

function getRewardIcon(type: CalendarReward['type'], rarity?: string) {
  switch (type) {
    case 'xp':
      return <Zap className="w-4 h-4 text-neo-yellow" />;
    case 'hints':
      return <Sparkles className="w-4 h-4 text-neo-cyan" />;
    case 'streak_freeze':
      return <Shield className="w-4 h-4 text-neo-lime" />;
    case 'mystery_box':
      return <Gift className={cn("w-4 h-4", rarity === 'legendary' ? 'text-neo-yellow' : rarity === 'epic' ? 'text-neo-pink' : rarity === 'rare' ? 'text-neo-cyan' : 'text-neo-cream')} />;
    case 'exclusive_title':
      return <Crown className="w-4 h-4 text-neo-pink" />;
    default:
      return <Gift className="w-4 h-4 text-neo-cream" />;
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
    <motion.button
      onClick={canClaim ? onClaim : undefined}
      disabled={!canClaim}
      className={cn(
        "relative flex flex-col items-center justify-center p-2 rounded-neo border-2 transition-all",
        "min-h-[60px] sm:min-h-[70px]",
        // Base styles
        isClaimed && "bg-neo-gray/50 border-neo-gray/50 opacity-60",
        !isClaimed && !isPast && !isToday && "bg-neo-navy-light border-neo-cream/30",
        isPast && !isClaimed && "bg-neo-navy-light/50 border-neo-cream/20 opacity-40",
        // Today styles
        isToday && canClaim && [
          "bg-gradient-to-br",
          rarityColors[rarity],
          rarityBorders[rarity],
          rarityGlows[rarity],
          "cursor-pointer hover:scale-105 hover:shadow-hard",
          "animate-pulse",
        ],
        isToday && !canClaim && "bg-neo-gray/50 border-neo-lime/50",
        // Milestone styles
        isMilestone && !isClaimed && !isPast && "border-neo-yellow",
      )}
      whileTap={canClaim ? { scale: 0.95 } : undefined}
    >
      {/* Day number */}
      <span className={cn(
        "text-xs font-bold absolute top-1 left-1.5",
        isClaimed ? "text-neo-cream/50" : "text-neo-cream/70",
        isToday && "text-neo-cream font-black",
      )}>
        {reward.day}
      </span>

      {/* Status indicator */}
      {isClaimed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check className="w-6 h-6 text-neo-lime" />
        </div>
      )}

      {isPast && !isClaimed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-4 h-4 text-neo-cream/30" />
        </div>
      )}

      {/* Reward content (hidden when claimed) */}
      {!isClaimed && !isPast && (
        <div className="flex flex-col items-center gap-0.5 mt-2">
          {getRewardIcon(reward.type, reward.rarity)}
          <span className={cn(
            "text-[9px] sm:text-[10px] font-bold uppercase",
            isToday ? "text-neo-cream" : "text-neo-cream/70",
          )}>
            {getRewardLabel(reward)}
          </span>
        </div>
      )}

      {/* Milestone indicator */}
      {isMilestone && !isClaimed && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-neo-yellow rounded-full border border-neo-black" />
      )}

      {/* Today badge */}
      {isToday && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-neo-yellow text-neo-black text-[8px] font-black px-1.5 py-0.5 rounded-neo border border-neo-black">
          TODAY
        </div>
      )}
    </motion.button>
  );
}

export default CalendarRewardCard;
