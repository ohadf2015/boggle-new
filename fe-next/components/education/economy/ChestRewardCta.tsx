'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChestLocker } from './useChestLocker';
import { useRoundReward } from './useRoundReward';
import { useStudentAvatar } from './useStudentAvatar';
import RewardChest from './RewardChest';
import { chestArtSrc } from './chestPhase';
import { cn } from '@/lib/utils';

interface ChestRewardCtaProps {
  gameCode: string;
  roundId: string | null;
  quiet?: boolean;
}

/** The round's chest on the student results card. Renders only what the server sent. */
export default function ChestRewardCta({ gameCode, roundId, quiet = false }: ChestRewardCtaProps) {
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
        className={cn(
          'flex w-full items-center gap-3 text-start font-bold active:translate-x-0.5 active:translate-y-0.5',
          quiet
            ? 'rounded-neo border-[3px] border-neo-lime bg-neo-navy-elevated px-3 py-2 text-neo-cream shadow-hard-sm'
            : 'rounded-2xl border-4 border-black bg-neo-lime p-3 text-neo-navy shadow-hard-lg'
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small transparent chest sprite */}
        <img src={chestArtSrc(reveal.rarity, false)} alt="" className={cn('shrink-0 object-contain', quiet ? 'size-10' : 'h-14 w-14')} />
        <span className="flex flex-col">
          <span className={quiet ? 'text-base' : 'text-lg'}>{collected ? t('economy.reward.collected') : t('economy.reward.ready')}</span>
          <span className="text-sm">{t('economy.chest.xp', { xp: reveal.xp })}</span>
          {reveal.bossWin && <span className="text-sm">{t('classroomBoss.chestUpgraded')}</span>}
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
