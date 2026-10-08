'use client';

import { COSMETICS } from '@/lib/cosmetics';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChestLocker } from './useChestLocker';
import { useClassroomEconomy } from './useClassroomEconomy';
import ClassroomBoardMoment from './ClassroomBoardMoment';

interface ClassroomRoundRewardProps {
  gameCode: string;
}

/** Class board and the student's locker, in the results details sheet. */
export default function ClassroomRoundReward({ gameCode }: ClassroomRoundRewardProps) {
  const { t } = useLanguage();
  const econ = useClassroomEconomy(gameCode);
  const locker = useChestLocker();

  return (
    <section aria-labelledby="round-reward-title" className="flex flex-col items-center gap-4 px-3 py-4">
      <h2 id="round-reward-title" className="sr-only">{t('economy.reward.title')}</h2>

      {econ.board && (
        <div className="w-full max-w-sm">
          <ClassroomBoardMoment board={econ.board} />
        </div>
      )}

      {locker.items.length > 0 && (
        <div className="w-full max-w-sm rounded-2xl border-4 border-neo-cream/40 bg-neo-navy p-3 text-white shadow-[6px_6px_0_0_#000]">
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
    </section>
  );
}
