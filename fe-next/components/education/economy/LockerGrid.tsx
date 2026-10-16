'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { COSMETICS } from '@/lib/cosmetics';
import { PartThumb } from '@/lib/avatar/catalog';
import { revealPartNameKey } from '@/lib/avatar/revealTrigger';
import { chestPartUnlock } from '@/backend/modules/classroomEconomyPool';
import type { ChestRarity, ClassroomLockerEntry } from '@/shared/constants/classroomEconomy';
import { useStudentAvatar } from './useStudentAvatar';

const RARITY_FRAME: Record<ChestRarity, string> = {
  common: 'border-neo-cream/60',
  rare: 'border-neo-cyan',
  epic: 'border-neo-purple',
};

const RARITY_TEXT: Record<ChestRarity, string> = {
  common: 'text-neo-cream/80',
  rare: 'text-neo-cyan',
  epic: 'text-neo-purple',
};

/** The student's chest items: part thumbnail, name and rarity. Shared by the hub locker and the round results. */
export default function LockerGrid({ items }: { items: ClassroomLockerEntry[] }) {
  const { t } = useLanguage();
  const wearing = useStudentAvatar();
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const unlock = chestPartUnlock(item.itemId);
        const legacyName = unlock ? undefined : COSMETICS.find((c) => c.id === item.itemId)?.name;
        const name = unlock ? t(revealPartNameKey(unlock)) : legacyName ? t(legacyName) : t('economy.chest.chip.item');
        return (
          <li
            key={`${item.gameCode}-${item.roundId}`}
            className={`flex flex-col items-center gap-1 rounded-neo border-2 bg-neo-navy-light p-2 text-center text-xs ${RARITY_FRAME[item.rarity]}`}
          >
            {unlock && unlock.category !== 'bgColor' && (
              <PartThumb category={unlock.category} id={unlock.partId} config={wearing} size={44} />
            )}
            <span className="block font-bold text-white">{name}</span>
            <span className={`font-neo-display text-[0.65rem] font-black uppercase ${RARITY_TEXT[item.rarity]}`}>
              {t(`economy.chest.rarity.${item.rarity}`)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
