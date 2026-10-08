'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChestLocker } from './useChestLocker';
import { useRoundReward } from './useRoundReward';
import { useStudentAvatar } from './useStudentAvatar';
import RewardChest from './RewardChest';
import { chestArtSrc } from './chestPhase';

interface ChestRewardCtaProps {
  gameCode: string;
  roundId: string | null;
}

/** The round's chest on the student results card. Renders only what the server sent. */
export default function ChestRewardCta({ gameCode, roundId }: ChestRewardCtaProps) {
  const { t } = useLanguage();
  const reveal = useRoundReward(gameCode, roundId);
  const locker = useChestLocker();
  const wearing = useStudentAvatar();
  const [opening, setOpening] = useState(false);
  const [collected, setCollected] = useState(false);

  if (!reveal) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpening(true)}
        className="flex w-full items-center gap-3 rounded-2xl border-4 border-black bg-neo-lime p-3 text-start font-bold text-neo-navy shadow-[4px_4px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5"
      >
        <img src={chestArtSrc(reveal.rarity, false)} alt="" className="h-14 w-14 shrink-0 object-contain" />
        <span className="flex flex-col">
          <span className="text-lg">{collected ? t('economy.reward.collected') : t('economy.reward.ready')}</span>
          <span className="text-sm">{t('economy.chest.xp', { xp: reveal.xp })}</span>
        </span>
      </button>
      {opening && (
        <RewardChest
          reveal={reveal}
          wearing={wearing}
          onClose={() => {
            setOpening(false);
            setCollected(true);
            locker.refresh();
          }}
        />
      )}
    </>
  );
}
