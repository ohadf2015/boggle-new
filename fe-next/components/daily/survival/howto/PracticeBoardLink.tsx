'use client';

import React from 'react';
import { Dumbbell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';

/** A plain anchor: a query-only client navigation on the same route would keep the live game's state mounted. */
export function PracticeBoardLink({ className, iconClassName }: { className: string; iconClassName: string }) {
  const { t, language } = useLanguage();
  const inPractice = usePracticeFlag();
  if (inPractice) return null;
  return (
    <a href={practiceTargetUrl('wordHunt', language)} className={className}>
      <Dumbbell className={iconClassName} aria-hidden="true" />
      {t('daily.practiceBoard')}
    </a>
  );
}
