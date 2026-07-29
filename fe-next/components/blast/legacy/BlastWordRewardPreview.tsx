'use client';

import { memo } from 'react';

interface BlastWordRewardPreviewProps {
  wordLength: number;
}

const REWARD_TIERS = [
  { min: 7, icons: '🔷 🌈', label: 'Prism/Rainbow', color: 'text-purple-400' },
  { min: 6, icons: '💣 ⚡', label: 'Bomb/Lightning', color: 'text-orange-400' },
  { min: 5, icons: '✦ 💠', label: 'Gold/Diamond',   color: 'text-yellow-400' },
] as const;

function getRewardTier(wordLength: number) {
  for (const tier of REWARD_TIERS) {
    if (wordLength >= tier.min) return tier;
  }
  return null;
}

export const BlastWordRewardPreview = memo(function BlastWordRewardPreview({
  wordLength,
}: BlastWordRewardPreviewProps) {
  const tier = getRewardTier(wordLength);
  if (!tier) return null;

  return (
    <div
      data-testid="word-reward-preview"
      className={`flex items-center justify-center gap-1 text-xs ${tier.color} font-neo-body animate-pulse`}
    >
      <span className="text-sm">{tier.icons}</span>
      <span className="opacity-70">+1 tile</span>
    </div>
  );
});

export default BlastWordRewardPreview;
