'use client';

import { cn } from '@/lib/utils';
import { NB_INPUT } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export const SETUP_FIELD_LABEL = 'font-neo-body text-sm font-black text-neo-cream';

export interface SetupOwnWords {
  text: string;
  onTextChange: (text: string) => void;
  count: number;
  dropped: number;
  min: number;
}

/** Optional paste box: enough playable words replace the starter list as the class's first list. */
export function SetupOwnWordsField({ own, t }: { own: SetupOwnWords; t: T }) {
  const short = own.count > 0 && own.count < own.min;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="setup-own-words" className={SETUP_FIELD_LABEL}>
        {t('eduShell.setup.words.label')} <span className="font-semibold text-neo-cream/70">· {t('common.optional')}</span>
      </label>
      <textarea
        id="setup-own-words"
        data-testid="setup-own-words"
        dir="auto"
        rows={2}
        value={own.text}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => own.onTextChange(e.target.value)}
        placeholder={t('eduShell.setup.words.placeholder')}
        className={cn(NB_INPUT, 'h-16 resize-none py-2 leading-snug')}
      />
      {short ? (
        <p data-testid="setup-own-words-status" aria-live="polite" className="font-neo-body text-sm font-semibold text-neo-cream/80">
          {t('eduShell.setup.ownWords.needMore', { count: own.min - own.count })}
        </p>
      ) : null}
      {own.dropped > 0 ? (
        <p data-testid="setup-own-words-dropped" className="font-neo-body text-sm font-semibold text-neo-cream/80">
          {t('eduShell.setup.ownWords.dropped', { count: own.dropped })}
        </p>
      ) : null}
    </div>
  );
}

export default SetupOwnWordsField;
