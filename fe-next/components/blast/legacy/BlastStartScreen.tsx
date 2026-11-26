'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Bomb, Gem, Trophy, type LucideIcon } from 'lucide-react';
import { Coins } from '@/components/ui/CoinsIcon';
import { Button } from '@/components/ui/button';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { MascotRig } from '@/components/motion/MascotRig';
import { PressSurface } from '@/components/motion/PressSurface';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PRIMARY_CTA = 'min-h-[60px] w-full max-w-xs font-black text-xl uppercase border-3 border-neo-black';

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
    <div className="relative isolate flex-1 flex flex-col items-center justify-center gap-5 overflow-hidden px-4 py-6">
      <AmbientBackdrop theme="solo" />
      <MascotRig>
        <Image
          data-testid="blast-start-art"
          src="/modes/blast.png"
          alt=""
          width={144}
          height={144}
          priority
          className="h-32 w-32 drop-shadow-[4px_4px_0_rgb(var(--neo-black))] sm:h-36 sm:w-36"
        />
      </MascotRig>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-black uppercase text-neo-white font-neo-display">{t('blast.ready.title')}</h1>
        <p className="max-w-xs text-sm font-semibold text-neo-white/85">{t('blast.ready.tagline')}</p>
      </div>
      <ul className="flex gap-2" aria-label={t('blast.ready.tileGuide')}>
        {TILES.map(({ key, Icon, tone }) => (
          <li
            key={key}
            title={t(`blast.tileGuide.${key}.desc`)}
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
          <Button data-testid="resume-button" size="lg" press="chunky" variant="success" onClick={onResume} className={PRIMARY_CTA}>
            {t('blast.ready.resume', { wave: resumeWave })}
          </Button>
          <PressSurface
            data-testid="play-button"
            lip={2}
            onClick={onStart}
            className="min-h-[48px] w-full max-w-xs rounded-neo border-2 border-neo-white/70 bg-transparent font-neo-display text-sm font-bold uppercase tracking-wide text-neo-white shadow-neo-white/30"
          >
            {t('blast.ready.play')}
          </PressSurface>
        </>
      ) : (
        <Button data-testid="play-button" size="lg" press="chunky" variant="success" onClick={onStart} className={PRIMARY_CTA}>
          {t('blast.ready.start')}
        </Button>
      )}
      {children}
    </div>
  );
}
