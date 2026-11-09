'use client';

import { useId } from 'react';
import { Eye, EyeOff, Trophy, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { LEADERBOARD_VISIBILITIES, type LeaderboardVisibility } from '@/lib/supabase/education/types';

const ICONS: Record<LeaderboardVisibility, typeof Eye> = { top3: Trophy, full: Eye, personal_only: User, hidden: EyeOff };

/** 'personal_only' is a DB value; the i18n key is camelCase like every other key in this file. */
const KEY: Record<LeaderboardVisibility, string> = { top3: 'top3', full: 'full', personal_only: 'personal', hidden: 'off' };

export interface LeaderboardVisibilityPickerProps {
  /** null while the saved setting loads: every option renders, none checked, all disabled. */
  value: LeaderboardVisibility | null;
  onChange: (value: LeaderboardVisibility) => void;
}

/** How much of the class standings students see on their phones. One radio group, one line of help per option. */
export function LeaderboardVisibilityPicker({ value, onChange }: LeaderboardVisibilityPickerProps) {
  const { t } = useLanguage();
  const name = useId();
  const loading = value === null;
  return (
    <fieldset role="radiogroup" data-testid="leaderboard-visibility-picker" aria-busy={loading || undefined} className="min-w-0">
      <legend className="mb-1 block font-neo-body text-sm font-black text-neo-cream">{t('teacher.classroom.leaderboard.label')}</legend>
      <p className="mb-2 font-neo-body text-xs font-semibold text-neo-cream/75">{t('teacher.classroom.leaderboard.hint')}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LEADERBOARD_VISIBILITIES.map((option) => {
          const checked = option === value;
          const Icon = ICONS[option];
          return (
            <label
              key={option}
              data-option={option}
              className={cn(
                'relative flex min-h-12 cursor-pointer select-none items-start gap-2 rounded-neo border-2 px-3 py-2 font-neo-body transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
                'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-neo-cyan has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-neo-navy',
                checked ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard-sm' : 'border-neo-cream/50 bg-neo-navy-light text-neo-cream hover:border-neo-cream',
                loading && 'cursor-wait opacity-60',
              )}
            >
              <input type="radio" name={name} value={option} checked={checked} disabled={loading} onChange={() => onChange(option)} className="sr-only" />
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" strokeWidth={2.5} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-sm font-black">{t(`teacher.classroom.leaderboard.${KEY[option]}`)}</span>
                <span className={cn('text-xs font-semibold', checked ? 'text-neo-black/75' : 'text-neo-cream/70')}>
                  {t(`teacher.classroom.leaderboard.${KEY[option]}Hint`)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default LeaderboardVisibilityPicker;
