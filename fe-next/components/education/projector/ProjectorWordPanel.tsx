'use client';

import type { CSSProperties } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RISE, type Translate } from '@/components/education/live/eduLiveStyles';
import type { StudyCard } from '@/shared/utils/studyCards';

/** Two rows of six on a wide wall; the rest of the deck is on the students' phones. */
export const PROJECTOR_WORDS_MAX = 12;

interface ProjectorWordPanelProps {
  cards: readonly StudyCard[];
  t: Translate;
  className?: string;
  style?: CSSProperties;
}

/** The lesson's words, big enough to read from the back row while the teacher introduces them. */
export function ProjectorWordPanel({ cards, t, className, style }: ProjectorWordPanelProps) {
  if (!cards.length) return null;
  const shown = cards.slice(0, PROJECTOR_WORDS_MAX);
  const more = cards.length - shown.length;
  return (
    <section
      data-testid="projector-words"
      style={style}
      className={cn('min-w-0 rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light p-[clamp(0.5rem,1cqw,1.25rem)] text-neo-cream', RISE, className)}
    >
      <h2 className="mb-[clamp(0.375rem,0.7cqw,0.875rem)] flex items-center gap-[0.4em] font-neo-display font-bold leading-none text-[clamp(1rem,min(1.5cqw,2.6cqh),2.25rem)]">
        <BookOpen className="size-[1em] shrink-0" aria-hidden="true" />
        {t('education.projectorLobby.wordsTitle')}
        {more > 0 && (
          <span data-testid="projector-words-more" className="ms-auto font-neo-body text-[0.75em] font-bold text-neo-cream/75">
            {t('education.projectorLobby.moreWords', { count: more })}
          </span>
        )}
      </h2>
      <ul className="grid grid-cols-2 gap-[clamp(0.375rem,0.8cqw,1rem)] @3xl:grid-cols-3 @5xl:grid-cols-6">
        {shown.map((card) => (
          <li
            key={card.word}
            data-testid="projector-word"
            className="min-w-0 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-[0.6em] py-[0.4em] shadow-hard-sm"
          >
            <p dir="auto" className="truncate font-neo-display font-black leading-tight text-neo-lime text-[clamp(1.125rem,min(2.2cqw,3.6cqh),3.25rem)]">
              {card.word}
            </p>
            {card.definition && (
              <p dir="auto" className="line-clamp-2 font-neo-body leading-snug text-neo-cream/85 text-[clamp(0.8125rem,min(1.05cqw,1.9cqh),1.625rem)]">
                {card.definition}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
