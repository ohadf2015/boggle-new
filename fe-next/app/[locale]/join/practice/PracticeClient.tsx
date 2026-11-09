'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SpellingChallengePractice } from '@/components/practice/SpellingChallengePractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { StarterPracticePack } from '@/components/education/join/starterPracticePack';

interface GuestPracticeClientProps {
  locale: string;
  pack: StarterPracticePack;
}

export function GuestPracticeClient({ locale, pack }: GuestPracticeClientProps) {
  const { t, dir } = useLanguage();
  const router = useRouter();
  const joinHref = `/${locale}/join`;
  const words = useMemo<VocabularyWord[]>(
    () => pack.words.map((w) => ({ word: w.word, definition: w.definition || undefined, canIntegrate: true })),
    [pack.words],
  );

  return (
    <div data-testid="guest-practice-root" dir={dir} className="flex h-dvh flex-col overflow-hidden bg-neo-navy pb-[var(--cookie-consent-height,0px)] text-neo-white">
      <header className="flex items-center gap-3 border-b-4 border-neo-black bg-neo-navy-light px-4 py-3 tv:px-8 tv:py-5">
        <div className="min-w-0 flex-1">
          <h1 className="font-neo-display text-xl font-black uppercase leading-tight tv:text-3xl">{t('education.student.deadEnd.practiceTitle')}</h1>
          <p dir="auto" className="font-neo-body text-sm font-bold leading-snug text-neo-cyan tv:text-lg">
            {t(pack.nameKey)} · {t('education.student.deadEnd.wordCount', { count: String(words.length) })}
          </p>
        </div>
        <Link
          href={joinHref}
          prefetch={false}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-cream px-3 py-2 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan tv:text-lg"
        >
          <KeyRound aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.75} />
          {t('education.student.deadEnd.enterCode')}
        </Link>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-4 sm:px-6">
        <SpellingChallengePractice words={words} onComplete={() => undefined} onBack={() => router.push(joinHref)} />
      </main>
    </div>
  );
}

export default GuestPracticeClient;
