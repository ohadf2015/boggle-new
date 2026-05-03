'use client';

import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  /** Optional override className for positioning */
  className?: string;
}

/**
 * Small fixed badge engines render in the HUD when `usePracticeFlag()` is true.
 * Tells the player no XP / coins / leaderboard writes are happening.
 */
export default function PracticeBadge({ className = '' }: Props) {
  const { t } = useLanguage();
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-cream px-2.5 py-1 shadow-hard-sm ${className}`}
      role="status"
      aria-label={t('practiceBadge.aria')}
    >
      <GraduationCap className="w-3.5 h-3.5 text-neo-black" aria-hidden />
      <span className="text-[11px] font-neo-display font-black text-neo-black uppercase tracking-wide">
        {t('practiceBadge.label')}
      </span>
    </div>
  );
}
