/**
 * The three ways a teacher can answer "which words?" on the PLAY NOW panel.
 *
 * All three are visible as one segmented row and each is a plain pressable —
 * deliberately NOT `role="tab"`. The dashboard's own contract test forbids a
 * tab bar, and rightly: a tab implies pages of a form you work through, and
 * this panel is one armed button with a way to change its ammunition.
 */

'use client';

import { memo } from 'react';
import { BookMarked, Sparkles, ClipboardPaste, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { MIN_PASTED_WORDS } from './quickLaunchIntent';

export type PlayNowSource = 'recent' | 'packs' | 'paste';

const SOURCE_META: Array<{ id: PlayNowSource; labelKey: string; icon: typeof BookMarked; tint: string }> = [
  { id: 'recent', labelKey: 'teacher.playNow.sourceRecent', icon: BookMarked, tint: 'bg-neo-cyan' },
  { id: 'packs', labelKey: 'teacher.playNow.sourcePacks', icon: Sparkles, tint: 'bg-neo-lime' },
  { id: 'paste', labelKey: 'teacher.playNow.sourcePaste', icon: ClipboardPaste, tint: 'bg-neo-pink' },
];

export const SourceSwitch = memo(function SourceSwitch({
  active,
  available,
  onChange,
}: {
  active: PlayNowSource;
  available: ReadonlySet<PlayNowSource>;
  onChange: (next: PlayNowSource) => void;
}) {
  const { t } = useLanguage();
  return (
    <div role="group" aria-label={t('teacher.playNow.sourceGroup')} className="flex flex-wrap gap-2">
      {SOURCE_META.filter((s) => available.has(s.id)).map(({ id, labelKey, icon: Icon, tint }) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            data-testid={`play-now-source-${id}`}
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-black px-4 py-2',
              'font-neo-display text-sm font-black uppercase tracking-wide transition-all duration-100',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              on
                ? cn(tint, 'text-black shadow-hard -translate-y-0.5')
                : 'bg-neo-cream/85 text-black/70 shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
});

/** One row in the recent-lessons or starter-pack list. Selected = armed. */
export const PickRow = memo(function PickRow({
  title,
  meta,
  selected,
  testId,
  accent,
  onSelect,
}: {
  title: string;
  meta: string;
  selected: boolean;
  testId: string;
  accent: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'group flex w-full min-h-14 items-center gap-3 rounded-neo border-3 border-black px-4 py-3 text-start',
        'transition-all duration-100 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        selected
          ? 'bg-neo-cream shadow-hard -translate-y-0.5'
          : 'bg-neo-cream/70 shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard'
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-neo border-3 border-black',
          selected ? accent : 'bg-neo-white'
        )}
        aria-hidden="true"
      >
        {selected ? <Check className="size-4 text-black" strokeWidth={4} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-neo-display text-base font-black text-black">{title}</span>
        <span className="block truncate font-neo-body text-xs font-bold text-black/60">{meta}</span>
      </span>
    </button>
  );
});

export const PastePanel = memo(function PastePanel({
  value,
  words,
  onChange,
}: {
  value: string;
  words: string[];
  onChange: (next: string) => void;
}) {
  const { t } = useLanguage();
  const tooFew = words.length < MIN_PASTED_WORDS;
  return (
    <div className="space-y-2">
      <label htmlFor="play-now-paste" className="block font-neo-display text-sm font-black uppercase text-neo-white">
        {t('teacher.playNow.pasteLabel')}
      </label>
      <textarea
        id="play-now-paste"
        data-testid="play-now-paste-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={t('teacher.playNow.pastePlaceholder')}
        className={cn(
          'w-full rounded-neo border-3 border-black bg-neo-cream px-3 py-2',
          'font-neo-body text-base font-bold text-black shadow-hard-sm',
          'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan'
        )}
      />
      <p
        data-testid="play-now-paste-hint"
        className={cn(
          'font-neo-body text-xs font-bold',
          tooFew ? 'text-neo-pink' : 'text-neo-lime'
        )}
      >
        {tooFew
          ? t('teacher.playNow.pasteTooFew', { min: MIN_PASTED_WORDS })
          : t('teacher.playNow.pasteReady', { count: words.length })}
      </p>
    </div>
  );
});

export const STARTER_PACKS = STARTER_LESSON_PACKS;
