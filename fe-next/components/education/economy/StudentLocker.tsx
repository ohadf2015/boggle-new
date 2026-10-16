'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChestLocker } from './useChestLocker';
import LockerGrid from './LockerGrid';

/** Locker chip for the student hub. Hidden until the student owns a chest item. */
export default function StudentLocker() {
  const { t } = useLanguage();
  const { items } = useChestLocker();
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="student-locker"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border-2 border-black bg-neo-cyan px-3 font-black text-neo-navy shadow-hard-sm"
      >
        <Package aria-hidden="true" className="h-5 w-5" />
        <span>{items.length}</span>
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-56 rounded-neo border-3 border-neo-cream bg-neo-navy p-3 text-white shadow-hard-xl">
          <h3 className="mb-2 text-base font-bold">{t('economy.locker.title')}</h3>
          <LockerGrid items={items} />
        </div>
      )}
    </div>
  );
}
