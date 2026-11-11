'use client';

import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_INPUT } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export const SETUP_FIELD_LABEL = 'font-neo-body text-sm font-black text-neo-cream';

export interface SetupOwnWords {
  text: string;
  onTextChange: (text: string) => void;
  count: number;
  dropped: number;
  droppedWords?: readonly string[];
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
        className={cn(NB_INPUT, 'resize-none py-2 leading-snug', own.text.trim() ? 'h-28' : 'h-16')}
      />
      {short ? (
        <p data-testid="setup-own-words-status" aria-live="polite" className="font-neo-body text-sm font-semibold text-neo-cream/80">
          {t('eduShell.setup.ownWords.needMore', { count: own.min - own.count })}
        </p>
      ) : null}
      {own.dropped > 0 ? (
        <div
          data-testid="setup-own-words-dropped"
          role="status"
          className={cn(NB_BLOCK.yellow, 'flex flex-col gap-1.5 rounded-neo-lg border-[3px] border-neo-black px-3 py-2 shadow-hard')}
        >
          <p className="inline-flex items-start gap-1.5 font-neo-body text-sm font-black leading-snug">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('eduShell.setup.ownWords.dropped', { count: own.dropped })}
          </p>
          {own.droppedWords && own.droppedWords.length > 0 ? (
            <ul dir="auto" className="flex flex-wrap gap-1">
              {own.droppedWords.slice(0, 8).map((word, i) => (
                <li
                  key={`${word}-${i}`}
                  data-testid="setup-dropped-word"
                  className="max-w-full truncate rounded-neo-pill border-2 border-neo-black bg-neo-white px-2 font-neo-body text-xs font-black text-neo-black line-through decoration-2"
                >
                  {word}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default SetupOwnWordsField;
