'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Translate } from './eduLiveStyles';

interface EduStudentResultsMoreProps {
  words: { word: string }[];
  /** Everything above the student's word list; mounted on first open so a closed fold loads and reports nothing. */
  children: ReactNode;
  t: Translate;
}

export function EduStudentResultsMore({ words, children, t }: EduStudentResultsMoreProps) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      data-testid="edu-student-more"
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
      className="group rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-elevated shadow-hard"
    >
      <summary
        data-testid="edu-student-more-summary"
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-neo-display text-lg font-black [&::-webkit-details-marker]:hidden"
      >
        <span>{t('eduLiveRoom.studentResults.moreFromRound')}</span>
        <ChevronDown className="size-5 shrink-0 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      {opened && (
        <div className="flex flex-col gap-3 px-3 pb-3">
          {children}
          <h2 className="flex items-baseline justify-between gap-2 font-neo-display text-base font-black">
            {t('eduLiveRoom.studentResults.yourWords')}
            {words.length > 0 && <span className="font-neo-body text-sm font-bold tabular-nums text-neo-cream/70">{words.length}</span>}
          </h2>
          {words.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {words.map((w, i) => (
                <li
                  key={w.word}
                  data-testid="edu-student-word"
                  dir="auto"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border-2 border-neo-black px-2.5 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black',
                    i === 0 ? 'bg-neo-yellow shadow-hard-sm' : 'bg-neo-lime',
                  )}
                >
                  {i === 0 && <Star className="size-3.5 fill-neo-black" aria-hidden="true" />}
                  {w.word}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-neo-body text-sm font-bold text-neo-cream/80">{t('eduLiveRoom.studentResults.noWords')}</p>
          )}
        </div>
      )}
    </details>
  );
}
