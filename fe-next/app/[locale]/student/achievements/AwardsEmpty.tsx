'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Reveal, pressClasses } from '@/components/education/motion';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { INK_TEXT } from '@/components/student/academy/chrome';
import { cn } from '@/lib/utils';

export function AwardsEmpty() {
  const { t, language } = useLanguage() as unknown as { t: (k: string, f?: string) => string; language: string };
  return (
    <Reveal className="flex h-full min-h-[min(60dvh,26rem)] items-center justify-center">
      <div data-testid="awards-empty" className="flex max-w-sm flex-col items-center gap-3 px-4 py-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
        <img
          src={EDU_MASCOT.empty}
          alt=""
          aria-hidden="true"
          className="pointer-events-none size-36 select-none object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))] [@media(max-height:700px)]:size-24 sm:size-44"
        />
        <h2 dir="auto" className={cn('font-neo-display text-2xl font-black text-neo-white sm:text-3xl', INK_TEXT)}>
          {t('academy.pages.awardsEmptyTitle', 'No awards yet')}
        </h2>
        <p dir="auto" className="font-neo-body text-base font-bold text-neo-white/85">
          {t('academy.pages.awardsEmptyBody', 'Finish your first lesson and your first award lands here.')}
        </p>
        <Link
          href={`/${language}/student`}
          className={cn(
            pressClasses(4),
            'mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime px-6 font-neo-display text-base font-black uppercase tracking-wide text-neo-black',
          )}
        >
          <Play className="size-5 rtl:-scale-x-100" aria-hidden />
          {t('academy.pages.awardsEmptyCta', 'Play a lesson')}
        </Link>
      </div>
    </Reveal>
  );
}
