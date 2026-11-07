'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { getContent } from './word-solver/content';

export default function ToolsHubPageClient() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const content = useMemo(() => getContent(locale), [locale]);
  const isRtl = locale === 'he';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="font-neo-display text-3xl sm:text-4xl font-bold text-neo-yellow mb-2">
            {content.toolsHub.title}
          </h1>
          <p className="text-neo-white text-lg">{content.toolsHub.description}</p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Word Solver Card */}
          <Link
            href={`/${locale}/tools/word-solver`}
            className={cn(
              'block bg-neo-navy-light border-3 border-neo-black rounded-neo p-6',
              'shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]',
              'transition-[box-shadow,translate,scale,rotate,transform] duration-100 group'
            )}
          >
            <div className="text-4xl mb-3">&#128300;</div>
            <h2 className="font-neo-display text-xl font-bold text-neo-cyan group-hover:text-neo-yellow transition-colors mb-2">
              {content.toolsHub.wordSolverCard}
            </h2>
            <p className="text-neo-white text-sm">
              {content.toolsHub.wordSolverDesc}
            </p>
          </Link>

          <Link
            href="/en/word-finder"
            className={cn(
              'block bg-neo-navy-light border-3 border-neo-black rounded-neo p-6',
              'shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]',
              'transition-[box-shadow,translate,scale,rotate,transform] duration-100 group'
            )}
          >
            <div className="text-4xl mb-3">&#128269;</div>
            <h2 className="font-neo-display text-xl font-bold text-neo-cyan group-hover:text-neo-yellow transition-colors mb-2">
              Word Finder
            </h2>
            <p className="text-neo-white text-sm">
              Lock letters in exact positions, filter by start, end and length, and use blank tiles. English.
            </p>
          </Link>

          <Link
            href="/en/wordle-solver"
            className={cn(
              'block bg-neo-navy-light border-3 border-neo-black rounded-neo p-6',
              'shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]',
              'transition-[box-shadow,translate,scale,rotate,transform] duration-100 group'
            )}
          >
            <div className="text-4xl mb-3">&#129513;</div>
            <h2 className="font-neo-display text-xl font-bold text-neo-cyan group-hover:text-neo-yellow transition-colors mb-2">
              Wordle Solver
            </h2>
            <p className="text-neo-white text-sm">
              Tap in your tile colors and get the best next guess. Solves every Wordle answer, 3.46 guesses on average.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
