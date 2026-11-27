'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Grid3x3, Search, SpellCheck } from 'lucide-react';
import { AutoHideHeader } from '@/components/AutoHideHeader';
import { LandingHero, LandingPage, TileGrid, type TileItem } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { getContent } from './word-solver/content';

const ICON = 'h-8 w-8';

export default function ToolsHubPageClient({ children }: { children?: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const content = useMemo(() => getContent(locale), [locale]);
  const isRtl = locale === 'he';

  const tools: TileItem[] = [
    {
      href: `/${locale}/tools/word-solver`,
      icon: <SpellCheck aria-hidden className={ICON} strokeWidth={2.5} />,
      title: content.toolsHub.wordSolverCard,
      body: content.toolsHub.wordSolverDesc,
      tone: 'lime',
    },
  ];
  if (locale === 'en') {
    tools.push(
      {
        href: '/en/word-finder',
        icon: <Search aria-hidden className={ICON} strokeWidth={2.5} />,
        title: 'Word Finder',
        body: 'Lock letters in exact positions, filter by start, end and length, and use blank tiles. English.',
        tone: 'cyan',
      },
      {
        href: '/en/wordle-solver',
        icon: <Grid3x3 aria-hidden className={ICON} strokeWidth={2.5} />,
        title: 'Wordle Solver',
        body: 'Tap in your tile colors and get the best next guess. Solves every Wordle answer, 3.46 guesses on average.',
        tone: 'yellow',
      },
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <LandingPage locale={locale} topBar={false}>
        <LandingHero
          title={content.toolsHub.title}
          lead={content.toolsHub.description}
          art={LANDING_ART.solver('')}
          artTone="cyan"
        />
        <TileGrid headingLevel={2} items={tools} columns={tools.length > 1 ? 3 : 2} />
        {children}
      </LandingPage>
    </div>
  );
}
