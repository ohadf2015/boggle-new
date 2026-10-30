'use client';

import { useId, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import { languageFlag, languageLabelKey } from '@/lib/i18n/languageLabels';
import { nativeLanguageName } from './nativeLanguageName';

const ALL = 'all';

export interface LanguagePickerProps<V extends string> {
  label: ReactNode;
  value: V;
  onChange: (code: V) => void;
  options?: readonly V[];
  /** Adds a leading "all" option (filters). */
  allLabel?: string;
  /** "regular" = big tiles for forms; "compact" = wrapped chips inside dense forms; "filter" = compact + "all". */
  variant?: 'regular' | 'compact' | 'filter';
  /** "theme" follows the light/dark class for surfaces like DialogContent that are cream in light mode. */
  tone?: 'dark' | 'theme';
  /** "ring": selected option keeps the navy surface with a lime ring + check (calm teacher screens). */
  selection?: 'fill' | 'ring';
  showBoardHint?: boolean;
  /** Hide the visible legend when a surrounding control already names the group. */
  hideLabel?: boolean;
  className?: string;
  testId?: string;
}

const OPTION_BASE =
  'relative inline-flex cursor-pointer select-none items-center gap-2 rounded-neo border-2 font-neo-body font-bold ' +
  'transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97] ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-neo-cyan has-[:focus-visible]:ring-offset-2';

export function LanguagePicker<V extends string>({
  label,
  value,
  onChange,
  options = EDUCATION_LANGUAGES as unknown as readonly V[],
  allLabel,
  variant = 'regular',
  tone = 'dark',
  selection = 'fill',
  showBoardHint = false,
  hideLabel = false,
  className,
  testId,
}: LanguagePickerProps<V>) {
  const { t } = useLanguage();
  const name = useId();
  const hintId = `${name}-hint`;
  const codes = (allLabel ? [ALL, ...options] : options) as readonly V[];
  const dense = variant !== 'regular';
  const themed = tone === 'theme';
  const ring = selection === 'ring';

  return (
    <fieldset
      role="radiogroup"
      data-testid={testId}
      aria-describedby={showBoardHint ? hintId : undefined}
      className={cn('min-w-0', className)}
    >
      <legend
        className={hideLabel ? 'sr-only' : cn('mb-2 block font-neo-body text-sm font-bold', themed ? 'text-neo-black dark:text-neo-cream' : 'text-neo-cream')}
      >
        {label}
      </legend>
      <div
        data-picker-options
        className={dense ? 'flex flex-wrap gap-1.5' : 'grid grid-cols-2 gap-2 sm:grid-cols-3'}
      >
        {codes.map((code) => {
          const checked = code === value;
          const isAll = code === ALL;
          const native = isAll ? allLabel : nativeLanguageName(code);
          const translated = isAll ? '' : t(languageLabelKey(code));
          return (
            <label
              key={code}
              data-picker-option={code}
              className={cn(
                OPTION_BASE,
                variant === 'filter' ? 'min-h-9 gap-1.5 px-2 text-xs' : dense ? 'min-h-10 px-2.5 text-sm' : 'min-h-12 px-3 py-2 text-base',
                checked && ring
                  ? 'border-neo-lime bg-neo-navy-light text-neo-cream ring-2 ring-neo-lime'
                  : checked
                  ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard-sm'
                  : themed
                    ? 'border-neo-black/60 bg-neo-cream text-neo-black hover:bg-neo-black/5 dark:border-neo-cream/50 dark:bg-neo-navy-light dark:text-neo-cream dark:hover:bg-neo-navy'
                    : 'border-neo-cream/50 bg-neo-navy-light text-neo-cream hover:border-neo-cream hover:bg-neo-navy'
              )}
            >
              <input
                type="radio"
                name={name}
                value={code}
                checked={checked}
                onChange={() => onChange(code)}
                className="sr-only"
              />
              <span aria-hidden="true" className={dense ? 'text-base leading-none' : 'text-xl leading-none'}>
                {isAll ? '\u{1F310}' : languageFlag(code)}
              </span>
              <span className="flex min-w-0 flex-col text-start leading-tight">
                <span lang={isAll ? undefined : code} className="truncate">{native}</span>
                {!dense && translated && translated !== native && (
                  <span className={cn('truncate text-xs font-semibold', checked && !ring ? 'text-neo-black/70' : themed ? 'text-neo-black/65 dark:text-neo-cream/65' : 'text-neo-cream/65')}>
                    {translated}
                  </span>
                )}
              </span>
              {dense && translated && translated !== native && <span className="sr-only">{translated}</span>}
              {checked && ring ? (
                <span data-picker-check="" aria-hidden="true" className="absolute -end-1.5 -top-1.5 grid size-4 place-items-center rounded-full border border-neo-lime bg-neo-navy">
                  <Check className="size-3 text-neo-lime" strokeWidth={3.5} />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      {showBoardHint && (
        <p id={hintId} className={cn('mt-1.5 font-neo-body text-xs', themed ? 'text-neo-black/70 dark:text-neo-cream/70' : 'text-neo-cream/70')}>
          {t('eduPickers.language.defaultHint', 'New lists start in this language. Lessons can be in any language; each game plays in its list’s language.')}
        </p>
      )}
    </fieldset>
  );
}

export default LanguagePicker;
