'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { languageFlag } from '@/lib/i18n/languageLabels';
import { nativeLanguageName } from './nativeLanguageName';

/** Which letters and dictionary the students' board will use. */
export function BoardLanguageChip({ language, className }: { language: string; className?: string }) {
  const { t } = useLanguage();
  return (
    <span
      data-testid="board-language-chip"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-neo border-2 border-neo-lime bg-neo-navy-light px-2 py-0.5 font-neo-body text-xs font-bold text-neo-lime',
        className
      )}
    >
      <span aria-hidden="true">{languageFlag(language)}</span>
      <span>
        {t('eduPickers.board.label', 'Board: {language}', { language: nativeLanguageName(language) })}
      </span>
    </span>
  );
}
