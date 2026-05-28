'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Lock,
  Check,
  Coins,
  Palette,
  User,
  Map,
  Award,
  Smile,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { BattlePassReward, RewardRarity, RewardType } from '@/lib/battlepass/battlePassConfig';

interface BattlePassRewardCardProps {
  reward: BattlePassReward;
  tier: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  isPremiumSlot: boolean;
  onClaim?: () => void;
}

const RARITY_COLORS: Record<RewardRarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

const RARITY_BG: Record<RewardRarity, string> = {
  common: 'bg-gray-50',
  rare: 'bg-blue-50',
  epic: 'bg-purple-50',
  legendary: 'bg-amber-50',
};

const TYPE_ICONS: Record<RewardType, React.ElementType> = {
  coins: Coins,
  tile_skin: Palette,
  avatar_part: User,
  board_theme: Map,
  title: Award,
  emote: Smile,
  room_flair: Sparkles,
  xp_boost: Zap,
};

type CardState = 'locked' | 'unlocked' | 'claimable' | 'claimed';

function getCardState(isUnlocked: boolean, isClaimed: boolean): CardState {
  if (isClaimed) return 'claimed';
  if (isUnlocked) return 'claimable';
  return 'locked';
}

export default function BattlePassRewardCard({
  reward,
  tier,
  isUnlocked,
  isClaimed,
  isPremiumSlot,
  onClaim,
}: BattlePassRewardCardProps) {
  const { t } = useLanguage();
  const state = getCardState(isUnlocked, isClaimed);
  const Icon = TYPE_ICONS[reward.type] || Sparkles;
  const rarityColor = RARITY_COLORS[reward.rarity];

  return (
    <button
      onClick={state === 'claimable' ? onClaim : undefined}
      disabled={state !== 'claimable'}
      className={`
        relative w-16 h-20 flex flex-col items-center justify-center gap-1
        border-2 border-neo-black rounded-neo transition-all
        ${RARITY_BG[reward.rarity]}
        ${state === 'claimable' ? 'shadow-hard animate-pulse cursor-pointer hover:scale-105' : 'shadow-hard-sm'}
        ${state === 'claimed' ? 'opacity-80' : ''}
        ${state === 'locked' ? 'opacity-50' : ''}
        ${isPremiumSlot ? 'ring-2 ring-amber-400' : ''}
      `}
      style={{ borderColor: rarityColor }}
      title={t(reward.name)}
    >
      {/* Locked overlay */}
      {state === 'locked' && (
        <div className="absolute inset-0 bg-neo-black/30 rounded-neo flex items-center justify-center z-10">
          <Lock className="w-5 h-5 text-neo-white" />
        </div>
      )}

      {/* Claimed check */}
      {state === 'claimed' && (
        <div className="absolute -top-1.5 -inset-e-1.5 w-5 h-5 bg-green-500 border-2 border-neo-black rounded-full flex items-center justify-center z-10">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Icon */}
      <Icon className="w-6 h-6" style={{ color: rarityColor }} />

      {/* Value label */}
      <span className="text-[10px] font-bold text-neo-black/70 truncate max-w-full px-0.5">
        {typeof reward.value === 'number' ? reward.value : ''}
      </span>
    </button>
  );
}
