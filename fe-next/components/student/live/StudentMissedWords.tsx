'use client';

import { useState } from 'react';
import { BookOpenCheck, PartyPopper, Volume2 } from 'lucide-react';
import { speakWord } from '@/lib/speech/textToSpeech';
import { cn } from '@/lib/utils';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface StudentMissedWordsProps {
  words: string[];
  language: string;
  t: Translate;
  onPractice?: () => void;
  className?: string;
}

/** End-of-round "catch these next time": tap a word to hear it, one tap into practice. */
export function StudentMissedWords({ words, language, t, onPractice, className }: StudentMissedWordsProps) {
  const [speaking, setSpeaking] = useState<string | null>(null);

  if (words.length === 0) {
    return (
      <section
        data-testid="student-missed-words"
        className={cn('flex items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-3 py-2 text-neo-black shadow-hard', className)}
      >
        <PartyPopper aria-hidden="true" className="size-5 shrink-0" />
        <p className="font-neo-display text-sm font-black">{t('eduStudent.results.missedNone')}</p>
      </section>
    );
  }

  return (
    <section
      data-testid="student-missed-words"
      className={cn('rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-3 py-2 shadow-hard', className)}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h3 className="min-w-0 font-neo-display text-sm font-black uppercase leading-tight tracking-wide text-neo-yellow">
          {t('eduStudent.results.missedTitle')}
        </h3>
        {onPractice && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onPractice}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-neo-black bg-neo-cyan px-2.5 py-1 font-neo-display text-xs font-black uppercase text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none"
          >
            <BookOpenCheck aria-hidden="true" className="size-3.5" />
            {t('eduStudent.results.practiceThese')}
          </button>
        )}
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label={t('eduStudent.results.tapToHear')}>
        {words.map((word, i) => (
          <li key={word} className="motion-safe:animate-[lc-miss-in_320ms_cubic-bezier(.34,1.56,.64,1)_both]" style={{ animationDelay: `${i * 70}ms` }}>
            <button
              type="button"
              aria-label={t('eduStudent.results.hear', { word })}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setSpeaking(word);
                void speakWord(word, language).finally(() => setSpeaking((w) => (w === word ? null : w)));
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-cream px-2.5 py-1 font-neo-display text-base font-black text-neo-black shadow-hard-sm transition-transform active:scale-95 active:shadow-none',
                speaking === word && 'bg-neo-yellow motion-safe:animate-pulse'
              )}
            >
              <span dir="auto">{word}</span>
              <Volume2 aria-hidden="true" className="size-4 text-neo-navy/70" />
            </button>
          </li>
        ))}
      </ul>
      <style>{'@keyframes lc-miss-in{0%{transform:translateY(8px) scale(.8)}100%{transform:none}}'}</style>
    </section>
  );
}

export default StudentMissedWords;
