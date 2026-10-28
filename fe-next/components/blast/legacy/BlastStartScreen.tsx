'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Bomb, Coins, Gem, Trophy, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PRIMARY_CTA = 'min-h-[56px] w-full max-w-xs font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90';

const TILES: ReadonlyArray<{ key: 'bomb' | 'gold' | 'diamond'; Icon: LucideIcon; tone: string }> = [
  { key: 'bomb', Icon: Bomb, tone: 'bg-neo-pink text-neo-white' },
  { key: 'gold', Icon: Coins, tone: 'bg-neo-yellow text-neo-black' },
  { key: 'diamond', Icon: Gem, tone: 'bg-neo-cyan text-neo-black' },
];

export interface BlastStartScreenProps {
  personalBest: number | null;
  /** Wave a saved run resumes at; null when there is nothing to resume. */
  resumeWave: number | null;
  onStart: () => void;
  onResume: () => void;
  children?: ReactNode;
}

export function BlastStartScreen({ personalBest, resumeWave, onStart, onResume, children }: BlastStartScreenProps) {
  const { t, language } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-6">
      <Image
        data-testid="blast-start-art"
        src="/modes/blast.png"
        alt=""
        width={144}
        height={144}
        priority
        className="h-32 w-32 drop-shadow-[4px_4px_0_rgb(var(--neo-black))] sm:h-36 sm:w-36"
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black uppercase text-neo-white font-neo-display">{t('blast.ready.title')}</h1>
        <p className="max-w-xs text-sm font-semibold text-neo-white/85">{t('blast.ready.subtitle')}</p>
      </div>
      <ul className="flex gap-2" aria-label={t('blast.ready.tileGuide')}>
        {TILES.map(({ key, Icon, tone }) => (
          <li
            key={key}
            className={cn('flex items-center gap-1.5 rounded-neo border-2 border-neo-black px-2.5 py-1 shadow-hard-sm font-neo-display text-xs font-black uppercase', tone)}
          >
            <Icon className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
            {t(`blast.tileGuide.${key}.name`)}
          </li>
        ))}
      </ul>
      {personalBest != null && (
        <p
          data-testid="blast-start-best"
          className="flex items-center gap-1.5 font-neo-display text-sm font-black uppercase tracking-wide text-neo-yellow"
        >
          <Trophy className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
          {t('blast.ready.best', { score: personalBest.toLocaleString(language) })}
        </p>
      )}
      {resumeWave != null ? (
        <>
          <Button data-testid="resume-button" size="lg" onClick={onResume} className={PRIMARY_CTA}>
            {t('blast.ready.resume', { wave: resumeWave })}
          </Button>
          <Button
            data-testid="play-button"
            size="sm"
            variant="ghost"
            onClick={onStart}
            className="min-h-[40px] w-full max-w-xs font-bold text-sm uppercase text-neo-white hover:text-neo-white underline underline-offset-4 decoration-neo-white/40 hover:bg-transparent"
          >
            {t('blast.ready.play')}
          </Button>
        </>
      ) : (
        <Button data-testid="play-button" size="lg" onClick={onStart} className={PRIMARY_CTA}>
          {t('blast.ready.start')}
        </Button>
      )}
      {children}
    </div>
  );
}
