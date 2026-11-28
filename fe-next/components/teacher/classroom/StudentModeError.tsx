'use client';

import { RotateCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL } from '@/components/teacher/nb/nbStyles';

export function StudentModeError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div role="alert" className="m-4 flex flex-col items-center gap-3 rounded-neo-lg border-[3px] border-neo-black bg-edu-surface p-6 text-center text-edu-ink">
      <p className="font-neo-display text-lg font-black">{t('teacher.studentView.error')}</p>
      <button type="button" data-testid="student-view-retry" onClick={onRetry} className={cn(NB_SMALL, NB_BLOCK.lime)}>
        <RotateCw className="size-4" aria-hidden="true" />
        {t('teacher.studentView.retry')}
      </button>
    </div>
  );
}
