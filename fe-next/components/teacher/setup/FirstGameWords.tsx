'use client';

import type { Ref } from 'react';
import { ClipboardList, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StarterLessonPack } from '@/lib/education/starterLessonPacks';
import { NB_BLOCK, NB_INPUT, NB_PANEL, NB_PRIMARY, NB_STICKER } from '../nb/nbStyles';
import { StarterPackRow } from './StarterPackRow';

type T = (key: string, params?: Record<string, string | number>) => string;

export type FirstGameError = 'tooFew' | 'phrasesOnly' | null;

export interface FirstGameWordsProps {
  text: string;
  onTextChange: (text: string) => void;
  count: number;
  skipped: number;
  minWords: number;
  error: FirstGameError;
  packs: StarterLessonPack[];
  packKey: string;
  savedPackKey: string | null;
  onPackChange: (nameKey: string) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  t: T;
}

/** The teacher's own words, or a starter pack when the box is empty: whatever is here is what Play now runs. */
export function FirstGameWords({ text, onTextChange, count, skipped, minWords, error, packs, packKey, savedPackKey, onPackChange, textareaRef, t }: FirstGameWordsProps) {
  return (
    <section data-testid="first-game-panel" aria-labelledby="first-game-title" className={cn(NB_PANEL, 'flex flex-col gap-2.5 p-3 sm:p-4')}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="first-game-title" className="inline-flex items-center gap-2 font-neo-display text-lg font-black leading-tight text-neo-cream sm:text-xl">
          <ClipboardList className="size-5 shrink-0 text-neo-lime" aria-hidden="true" />
          {t('eduShell.setup.words.title')}
        </h2>
        {count > 0 ? (
          <span data-testid="first-game-count" aria-live="polite" className={cn(NB_STICKER, count >= minWords ? NB_BLOCK.lime : NB_BLOCK.yellow)}>
            {t('eduShell.setup.words.count', { count })}
          </span>
        ) : null}
      </div>
      <label htmlFor="first-game-words" className="sr-only">
        {t('eduShell.setup.words.label')}
      </label>
      <textarea
        id="first-game-words"
        ref={textareaRef}
        data-testid="first-game-words"
        dir="auto"
        rows={3}
        value={text}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'first-game-error' : undefined}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={t('eduShell.setup.words.placeholder')}
        className={cn(NB_INPUT, 'h-[80px] resize-none py-2 leading-snug sm:h-[88px] lg:h-[132px]')}
      />
      {error ? (
        <p id="first-game-error" role="alert" className={cn(NB_STICKER, NB_BLOCK.pink, 'whitespace-normal rounded-neo-lg px-3 py-1.5 text-sm')}>
          {error === 'tooFew' ? t('eduShell.setup.words.tooFew', { min: minWords }) : t('eduShell.setup.words.phrasesOnly')}
        </p>
      ) : null}
      {skipped > 0 ? (
        <p data-testid="first-game-skipped" className="font-neo-body text-sm font-semibold text-neo-cream/80">
          {t('eduShell.setup.words.skipped', { count: skipped })}
        </p>
      ) : null}
      {count === 0 && skipped === 0 ? (
        <StarterPackRow packs={packs} selectedKey={packKey} recommendedKey={savedPackKey ?? ''} onSelect={onPackChange} labelKey="eduShell.setup.words.packLabel" hintKey="eduShell.setup.words.packHint" badgeKey="eduShell.setup.words.saved" t={t} />
      ) : count > 0 ? (
        <p className="font-neo-body text-sm font-semibold text-neo-cream/80">{t('eduShell.setup.words.yours')}</p>
      ) : null}
    </section>
  );
}

export function PlayNowButton({ busy = false, onClick, t }: { busy?: boolean; onClick: () => void; t: T }) {
  return (
    <button type="button" data-testid="setup-play-now" data-hero="true" aria-busy={busy || undefined} onClick={onClick} className={cn(NB_PRIMARY, 'min-h-[60px] w-full text-2xl')}>
      {busy ? <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Play className="size-6 fill-current" aria-hidden="true" />}
      {t('eduShell.setup.words.playNow')}
    </button>
  );
}

export default FirstGameWords;
