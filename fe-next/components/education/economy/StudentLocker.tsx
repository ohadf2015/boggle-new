'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { COSMETICS } from '@/lib/cosmetics';
import { PartThumb } from '@/lib/avatar/catalog';
import { revealPartNameKey } from '@/lib/avatar/revealTrigger';
import { chestPartUnlock } from '@/backend/modules/classroomEconomyPool';
import { useChestLocker } from './useChestLocker';
import { useStudentAvatar } from './useStudentAvatar';

/** Locker chip for the student hub. Hidden until the student owns a chest item. */
export default function StudentLocker() {
  const { t } = useLanguage();
  const { items } = useChestLocker();
  const [open, setOpen] = useState(false);
  const wearing = useStudentAvatar();
  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="student-locker"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border-2 border-black bg-neo-cyan px-3 font-black text-neo-navy shadow-[3px_3px_0_0_#000]"
      >
        <Package aria-hidden="true" className="h-5 w-5" />
        <span>{items.length}</span>
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-56 rounded-2xl border-4 border-neo-cream/40 bg-neo-navy p-3 text-white shadow-[6px_6px_0_0_#000]">
          <h3 className="mb-2 text-base font-bold">{t('economy.locker.title')}</h3>
          <ul className="grid grid-cols-2 gap-2">
            {items.map((item) => {
              const unlock = chestPartUnlock(item.itemId);
              const legacyName = unlock ? undefined : COSMETICS.find((c) => c.id === item.itemId)?.name;
              return (
                <li key={`${item.gameCode}-${item.roundId}`} className="flex flex-col items-center gap-1 rounded-lg border-2 border-white/30 p-2 text-center text-xs">
                  {unlock && unlock.category !== 'bgColor' && (
                    <PartThumb category={unlock.category} id={unlock.partId} config={wearing} size={44} />
                  )}
                  <span className="block font-bold">{unlock ? t(revealPartNameKey(unlock)) : legacyName ? t(legacyName) : item.itemId}</span>
                  <span className="text-white/80">{t(`economy.chest.rarity.${item.rarity}`)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
