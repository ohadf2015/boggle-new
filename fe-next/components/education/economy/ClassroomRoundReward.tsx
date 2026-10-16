'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useChestLocker } from './useChestLocker';
import { useClassroomEconomy } from './useClassroomEconomy';
import ClassroomBoardMoment from './ClassroomBoardMoment';
import LockerGrid from './LockerGrid';

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
        <div className="w-full max-w-sm rounded-neo border-3 border-neo-cream bg-neo-navy p-3 text-white shadow-hard-xl">
          <h3 className="mb-2 text-lg font-bold">{t('economy.locker.title')}</h3>
          <LockerGrid items={locker.items} />
        </div>
      )}
    </section>
  );
}
