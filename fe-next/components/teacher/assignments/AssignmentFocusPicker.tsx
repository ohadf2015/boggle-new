'use client';

import { Crosshair, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VOCAB_FOCUSES, MIN_WORDS_PER_FOCUS, type PracticeFocusSetting, type VocabFocus } from '@/lib/education/vocabFocus';

interface AssignmentFocusPickerProps {
  focus: PracticeFocusSetting;
  onFocus: (focus: PracticeFocusSetting) => void;
  supportedFocuses: readonly VocabFocus[];
  focusCounts: Partial<Record<VocabFocus, number>> | null | undefined;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Practice-only vocabulary focus choice: "any" or one skill the chosen lesson has enough words for. */
export function AssignmentFocusPicker({ focus, onFocus, supportedFocuses, focusCounts, t }: AssignmentFocusPickerProps) {
  return (
    <div>
      <label className="block text-sm font-neo-body text-neo-white mb-1">
        {t('teacher.assignment.focus.label')}
      </label>
      <p className="text-xs text-neo-white/70 font-neo-body mb-2 text-pretty">
        {t('teacher.assignment.focus.help')}
      </p>
      <div
        role="radiogroup"
        aria-label={t('teacher.assignment.focus.label')}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={focus === 'any'}
          onClick={() => onFocus('any')}
          className={cn(
            'min-h-12 p-3 rounded-neo border-neo text-start transition',
            focus === 'any'
              ? 'bg-neo-cyan border-neo-cyan text-neo-black shadow-hard-sm'
              : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
          )}
        >
          <span className="font-bold block">{t('teacher.assignment.focus.any')}</span>
          <span className="text-xs opacity-80 block">{t('teacher.assignment.focus.anyHint')}</span>
        </button>
        {VOCAB_FOCUSES.map((option) => {
          const supported = supportedFocuses.includes(option);
          const active = focus === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!supported}
              onClick={() => supported && onFocus(option)}
              className={cn(
                'min-h-12 p-3 rounded-neo border-neo text-start transition',
                active && 'bg-neo-yellow border-neo-yellow text-neo-black shadow-hard-sm',
                !active && supported && 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80',
                !supported && 'bg-neo-navy/30 border-neo-black/40 text-neo-white/50 cursor-not-allowed'
              )}
            >
              <span className="font-bold flex items-center gap-1.5">
                {supported ? <Crosshair className="w-4 h-4" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
                {t(`education.vocabFocus.focus.${option}`)}
              </span>
              <span className="text-xs opacity-80 block">
                {supported
                  ? t('teacher.assignment.focus.questionCount', {
                      count: focusCounts?.[option] ?? 0,
                      skill: t(`education.vocabFocus.instructions.${option}`),
                    })
                  : t(`education.vocabFocus.unlock.${option}`, { min: MIN_WORDS_PER_FOCUS })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
