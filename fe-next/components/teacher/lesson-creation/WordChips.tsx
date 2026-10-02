'use client';

import { X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import { wordIssue } from '@/lib/education/library';

interface WordChipsProps {
  words: VocabularyWord[];
  language: Language;
  /** word index → stagger slot for chips that just arrived; they pop in, older ones stay still. */
  fresh: Map<string, number>;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onRemove: (index: number) => void;
  onChange: (index: number, patch: Partial<VocabularyWord>) => void;
}

export default function WordChips({ words, language, fresh, selected, onSelect, onRemove, onChange }: WordChipsProps) {
  const { t } = useLanguage();
  const current = selected !== null ? words[selected] : undefined;

  return (
    <div className="space-y-3">
      <ul data-testid="list-word-chips" className="flex flex-wrap gap-2" aria-label={t('eduLibrary.editor.wordsLabel')}>
        {words.map((w, i) => {
          const issue = wordIssue(w.word, language);
          const slot = fresh.get(w.word);
          const isSelected = selected === i;
          return (
            <li
              key={`${i}:${w.word}`}
              data-testid="list-word-chip"
              data-issue={issue ?? undefined}
              style={slot !== undefined ? { animationDelay: `${Math.min(slot * 28, 420)}ms` } : undefined}
              className={cn(
                'group inline-flex max-w-full min-w-0 items-stretch rounded-neo border-2 bg-neo-navy-light shadow-hard-sm',
                'transition-transform duration-150 hover:-translate-y-0.5',
                slot !== undefined && 'motion-safe:animate-neo-pop motion-safe:opacity-0',
                issue ? 'border-neo-pink' : 'border-neo-cream',
                isSelected && 'ring-3 ring-neo-cyan',
              )}
            >
              <button
                type="button"
                data-testid="list-word-chip-open"
                onClick={() => onSelect(isSelected ? null : i)}
                aria-pressed={isSelected}
                title={issue ? t(`eduLibrary.issue.${issue}`) : undefined}
                className="flex min-w-0 items-baseline gap-1.5 px-2.5 py-1.5 text-start focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
              >
                {issue && <AlertTriangle className="size-3.5 shrink-0 self-center text-neo-pink" aria-hidden="true" />}
                <span className="truncate font-neo-body text-sm font-bold text-neo-white">{w.word}</span>
                {w.definition && (
                  <span className="hidden max-w-[11rem] truncate text-xs text-neo-white/70 sm:inline">{w.definition}</span>
                )}
                {w.definition && <span className="sr-only sm:hidden">{w.definition}</span>}
                {!w.definition && <span className="sr-only">{t('eduLibrary.editor.noDefinition')}</span>}
                {w.definition && <span className="size-1.5 shrink-0 self-center rounded-full bg-neo-lime sm:hidden" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={t('eduLibrary.editor.removeWord', { word: w.word })}
                className="flex w-8 shrink-0 items-center justify-center border-s-2 border-neo-cream/40 text-neo-white/70 hover:text-neo-pink focus:outline-hidden focus-visible:text-neo-pink"
              >
                <X className="size-3.5" strokeWidth={3} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {current && selected !== null && (
        <div
          data-testid="list-word-edit"
          className="grid gap-2 rounded-neo border-2 border-neo-cyan bg-neo-black/40 p-3 shadow-hard-sm motion-safe:animate-pop-in sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
        >
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-bold uppercase text-neo-white/70">{t('eduLibrary.editor.word')}</span>
            <input
              value={current.word}
              onChange={(e) => onChange(selected, { word: e.target.value })}
              className="h-10 w-full min-w-0 rounded-neo border-2 border-neo-cream bg-neo-navy px-2 font-neo-body text-neo-white focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-bold uppercase text-neo-white/70">{t('eduLibrary.editor.definition')}</span>
            <input
              data-testid="list-word-definition"
              autoFocus
              value={current.definition ?? ''}
              onChange={(e) => onChange(selected, { definition: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(null); }}
              placeholder={t('eduLibrary.editor.definitionPlaceholder')}
              className="h-10 w-full min-w-0 rounded-neo border-2 border-neo-cream bg-neo-navy px-2 font-neo-body text-neo-white placeholder:text-neo-white/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
            />
          </label>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="h-10 self-end rounded-neo border-2 border-neo-black bg-neo-cyan px-4 font-neo-display text-sm font-bold uppercase text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none"
          >
            {t('eduLibrary.editor.done')}
          </button>
        </div>
      )}
    </div>
  );
}
