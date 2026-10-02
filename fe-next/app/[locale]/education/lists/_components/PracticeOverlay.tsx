'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { Language } from '@/types';

export type PracticeMode = 'grid' | 'spelling' | 'matching';

export interface PracticeOverlayProps {
  title: string;
  lang: string;
  words: Array<{ word: string; definition: string }>;
  playable: string[];
  initialMode: PracticeMode | null;
  labels: { close: string; pick: string; modes: Record<PracticeMode, { title: string; sub: string }> };
  onClose: () => void;
}

const SoloPracticeBoard = lazy(() => import('@/components/practice/SoloPracticeBoard'));
const SpellingChallengePractice = lazy(() =>
  import('@/components/practice/SpellingChallengePractice').then((m) => ({ default: m.SpellingChallengePractice })),
);
const WordMatchingPractice = lazy(() =>
  import('@/components/practice/WordMatchingPractice').then((m) => ({ default: m.WordMatchingPractice })),
);

const MODES: PracticeMode[] = ['grid', 'spelling', 'matching'];

export default function PracticeOverlay({ title, lang, words, playable, initialMode, labels, onClose }: PracticeOverlayProps) {
  const [mode, setMode] = useState<PracticeMode | null>(initialMode);

  /* Board and spelling compare typed letters, so they get the niqqud-free spelling. */
  const vocab = useMemo<VocabularyWord[]>(
    () => words.map((w) => ({ word: w.word, definition: w.definition || undefined, canIntegrate: true })),
    [words],
  );
  const boardVocab = useMemo<VocabularyWord[]>(
    () => vocab.map((w, i) => ({ ...w, word: playable[i] ?? w.word })),
    [vocab, playable],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const back = () => setMode(null);
  const done = () => undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex flex-col bg-neo-navy text-neo-white"
    >
      <div className="flex items-center justify-between gap-3 border-b-4 border-neo-cream/40 bg-neo-navy-light px-4 py-3">
        <p className="truncate font-neo-display text-base font-black sm:text-lg" dir="auto">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-white text-neo-navy shadow-hard"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6">
        {mode === null ? (
          <div className="mx-auto max-w-xl">
            <h2 className="font-neo-display text-2xl font-black uppercase">{labels.pick}</h2>
            <div className="mt-4 grid gap-3">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="rounded-neo border-3 border-neo-black bg-neo-cream p-4 text-start text-neo-navy shadow-hard-lg transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <span className="block font-neo-display text-lg font-black">{labels.modes[m].title}</span>
                  <span className="block text-sm text-neo-navy/70">{labels.modes[m].sub}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="mx-auto mt-16 h-10 w-10 animate-spin rounded-full border-4 border-neo-white/30 border-t-neo-lime" />
            }
          >
            {/* The board measures its leftover height, so this column must fill the dialog. */}
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
              {mode === 'grid' && (
                <SoloPracticeBoard
                  lessonName={title}
                  words={boardVocab}
                  language={lang as Language}
                  onComplete={done}
                  onBack={back}
                />
              )}
              {mode === 'spelling' && <SpellingChallengePractice words={boardVocab} onComplete={done} onBack={back} />}
              {mode === 'matching' && <WordMatchingPractice words={vocab} onComplete={done} onBack={back} />}
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
