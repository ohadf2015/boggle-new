'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { COSMETICS } from '@/lib/cosmetics';
import { useChestLocker } from './useChestLocker';
import { useClassroomEconomy } from './useClassroomEconomy';
import { useRoundReward } from './useRoundReward';
import RewardChest from './RewardChest';
import ClassroomBoardMoment from './ClassroomBoardMoment';
import { chestArtSrc } from './chestPhase';

interface ClassroomRoundRewardProps {
  gameCode: string;
  roundId: string | null;
}

/**
 * Student results block: the round's chest to collect, then the class board
 * between rounds. Renders nothing the server did not send.
 */
export default function ClassroomRoundReward({ gameCode, roundId }: ClassroomRoundRewardProps) {
  const { t } = useLanguage();
  const reveal = useRoundReward(gameCode, roundId);
  const econ = useClassroomEconomy(gameCode);
  const [opening, setOpening] = useState(false);
  const [collected, setCollected] = useState(false);
  const locker = useChestLocker();

  return (
    <section aria-labelledby="round-reward-title" className="flex flex-col items-center gap-4 px-3 py-4">
      <h2 id="round-reward-title" className="sr-only">{t('economy.reward.title')}</h2>

      {reveal && (
        <button
          type="button"
          onClick={() => setOpening(true)}
          className="flex w-full max-w-sm items-center gap-4 rounded-2xl border-4 border-black bg-neo-lime p-4 text-start font-bold text-neo-navy shadow-[6px_6px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5"
        >
          <img src={chestArtSrc(reveal.rarity, false)} alt="" className="h-20 w-20 shrink-0 object-contain" />
          <span className="flex flex-col">
            <span className="text-xl">{collected ? t('economy.reward.collected') : t('economy.reward.ready')}</span>
            <span className="text-base">{t('economy.chest.xp', { xp: reveal.xp })}</span>
          </span>
        </button>
      )}

      {econ.board && (
        <div className="w-full max-w-sm">
          <ClassroomBoardMoment board={econ.board} />
        </div>
      )}

      {locker.items.length > 0 && (
        <div className="w-full max-w-sm rounded-2xl border-4 border-black bg-neo-navy p-3 text-white shadow-[6px_6px_0_0_#000]">
          <h3 className="mb-2 text-lg font-bold">{t('economy.locker.title')}</h3>
          <ul className="grid grid-cols-2 gap-2">
            {locker.items.map((item) => {
              const name = COSMETICS.find((c) => c.id === item.itemId)?.name;
              return (
                <li key={`${item.gameCode}-${item.roundId}`} className="rounded-lg border-2 border-white/30 p-2 text-sm">
                  <span className="block font-bold">{name ? t(name) : item.itemId}</span>
                  <span className="text-white/80">{t(`economy.chest.rarity.${item.rarity}`)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {opening && reveal && (
        <RewardChest
          reveal={reveal}
          onClose={() => {
            setOpening(false);
            setCollected(true);
            locker.refresh();
          }}
        />
      )}
    </section>
  );
}
