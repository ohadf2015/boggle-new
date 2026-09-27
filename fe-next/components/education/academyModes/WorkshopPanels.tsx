'use client';

/**
 * Word Workshop presentation pieces: the ivory lesson word tiles, and the desktop side panel that tracks lesson words while the
 * match runs.
 */

import { Check, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AcademyPlayerChip, type AcademyPlayer } from './AcademyChrome';

/** One lesson word as a row of ivory letter tiles is too wide on phones — a single ivory plaque per word instead. */
export function LessonWordTile({ word, found, size = 'md' }: { word: string; found?: boolean; size?: 'md' | 'lg' }) {
  return (
    <li
      data-testid="workshop-lesson-word"
      data-found={found ? 'true' : 'false'}
      className={cn(
        'flex items-center gap-1 rounded-md border-[3px] border-black font-neo-display font-black text-black shadow-hard',
        size === 'lg' ? 'px-3 py-1.5 text-xl 2xl:text-2xl' : 'px-2 py-0.5 text-sm sm:text-base lg:px-3 lg:py-1 lg:text-2xl',
        found ? 'bg-neo-yellow' : 'bg-neo-cream',
      )}
      style={found ? { boxShadow: '3px 3px 0 #000, 0 0 16px rgba(255,214,0,0.8)' } : { backgroundImage: 'linear-gradient(180deg, #fffcf2 0%, #efdfbd 100%)' }}
    >
      {found ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : <Star className="h-3 w-3 shrink-0 fill-current opacity-60" aria-hidden />}
      <span>{word}</span>
    </li>
  );
}

/** Wide-desktop (2xl) side panel during the match: the student, the lesson words ticked off, the stars. */
export function WorkshopWordsPanel({ player, chips, found, stars }: { player?: AcademyPlayer; chips: string[]; found: Set<string>; stars: number }) {
  const { t } = useLanguage();
  return (
    <aside className="flex w-full flex-col gap-4 rounded-neo border-[3px] border-neo-yellow bg-neo-navy-elevated p-5 shadow-hard-lg">
      {player && <AcademyPlayerChip player={player} className="self-start" />}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-neo-display text-2xl font-black uppercase text-neo-yellow">{t('academy.modes.workshop.lessonWords', 'Lesson words')}</h2>
        <span className="rounded-full border-[3px] border-black bg-neo-yellow px-3 py-0.5 font-neo-display text-xl font-black text-black shadow-hard">
          {t('academy.modes.workshop.stars', '★ {count}', { count: stars })}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2" translate="no">
        {chips.slice(0, 16).map((w) => (
          <LessonWordTile key={w} word={w} found={found.has(w)} size="lg" />
        ))}
      </ul>
      <p className="font-neo-body text-base text-neo-cream">{t('academy.modes.workshop.panelHint', 'Build one of these (or a word hiding one) for a golden bonus.')}</p>
    </aside>
  );
}
