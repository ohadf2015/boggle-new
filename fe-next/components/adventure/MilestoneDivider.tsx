'use client';

import React, { memo } from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface MilestoneDividerProps {
  chapter: number;
}

/**
 * MilestoneDivider — Chapter break marker between level groups
 */
const MilestoneDivider = memo(function MilestoneDivider({ chapter }: MilestoneDividerProps) {
  const { t } = useLanguage();

  return (
    <div className="col-span-full flex items-center gap-3 py-3 my-1">
      <div className="flex-1 h-[2px] bg-neo-white/10" />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-neo-black/50 border-2 border-neo-black rounded-neo shadow-hard-sm">
        <Trophy
          data-testid="milestone-trophy"
          className="w-4 h-4 text-neo-yellow"
        />
        <span className="text-[10px] font-neo-display font-bold text-neo-white uppercase tracking-wider">
          {t('adventure.chapterComplete', { chapter })}
        </span>
      </div>
      <div className="flex-1 h-[2px] bg-neo-white/10" />
    </div>
  );
});

export default MilestoneDivider;
