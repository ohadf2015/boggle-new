'use client';

import { Grid2x2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type T = (key: string, fallback?: string) => string;

/** Word Craft, the recommended homework mode; disabled for a lesson language it has no tiles for. */
export function AssignmentWordcraftOption({ selected, disabled, onSelect, t }: { selected: boolean; disabled: boolean; onSelect: () => void; t: T }) {
  return (
    <button
      type="button"
      data-testid="assignment-mode-wordcraft"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'w-full mb-3 px-4 py-3 rounded-neo border-neo transition flex items-center gap-3 text-start disabled:cursor-not-allowed disabled:opacity-60',
        selected
          ? 'bg-neo-lime border-neo-lime text-neo-black shadow-hard-sm'
          : 'bg-neo-navy/50 border-neo-cream/40 text-neo-white hover:bg-neo-navy/80'
      )}
    >
      <Grid2x2 className="w-8 h-8 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0">
        <span className="font-bold block">{t('education.wordcraftAssignment.title')}</span>
        <span className="text-xs opacity-80 block">
          {disabled
            ? t('education.wordcraftAssignment.languageUnsupported', 'Word Craft has no tiles for this list’s language yet.')
            : t('education.wordcraftAssignment.teacherHint')}
        </span>
      </span>
      {!disabled && (
        <span className="shrink-0 rounded-neo border-2 border-black bg-neo-yellow px-2 py-0.5 text-xs font-black uppercase text-neo-black">
          {t('education.wordcraftAssignment.recommended')}
        </span>
      )}
    </button>
  );
}
