'use client';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import m from './landingMotion.module.css';
import { DeliveryTag } from '@/components/education/DeliveryTag';
import {
  catalogueModes,
  FEATURED_HOME_MODES,
  type CatalogueMode,
} from '@/components/education/ClassroomModeCatalogueData';

const ACCENT_BG: Record<CatalogueMode['accent'], string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  purple: 'bg-neo-purple',
};

/** The live class modes from the lobby's own catalogue, each with where it is played. */
export function LandingModes() {
  const { t } = useLanguage();
  const modes = catalogueModes();
  const featured = FEATURED_HOME_MODES.map((id) => modes.find((m) => m.id === id)).filter((m): m is CatalogueMode => !!m);
  const rest = modes.filter((m) => !FEATURED_HOME_MODES.includes(m.id));

  return (
    <section id="modes" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
      <h2 className="text-balance font-neo-display text-2xl font-black leading-tight text-neo-white sm:text-3xl">
        {t('eduPlans.modes.title', { count: modes.length })}
      </h2>
      <p className="mt-2 max-w-[60ch] text-base text-neo-white/75">{t('eduPlans.modes.sub')}</p>

      <ul className="mt-6 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr] md:gap-5">
        {featured.map((mode, i) => (
          <li
            key={mode.id}
            data-testid="landing-mode-card"
            style={{ '--i': i } as CSSProperties}
            className={cn(
              'flex items-center gap-3 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-cream p-2 pe-3 shadow-hard hover:shadow-hard-lg md:flex-col md:items-stretch md:p-0',
              m.card,
              m.reveal
            )}
          >
            <div className={cn('relative grid size-16 shrink-0 place-items-end overflow-hidden rounded-neo border-2 border-neo-black md:h-32 md:w-full md:rounded-none md:border-0 md:border-b-3', ACCENT_BG[mode.accent])}>
              <Image src={mode.poster} alt="" aria-hidden="true" width={128} height={128} className={cn('mx-auto h-full w-auto object-contain object-bottom', m.modeArt)} />
            </div>
            <div className="min-w-0 flex-1 md:px-4 md:pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-neo-display text-base font-black leading-tight text-neo-navy md:text-lg">{t(mode.nameKey)}</h3>
                <DeliveryTag delivery={mode.delivery} t={t} />
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-neo-navy/75 sm:text-sm">{t(mode.howKey)}</p>
            </div>
          </li>
        ))}
      </ul>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label={t('eduPlans.modes.moreLabel')}>
        {rest.map((mode) => (
          <li
            key={mode.id}
            data-testid="landing-mode-card"
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light py-1.5 pe-2 ps-1.5"
          >
            <span className={`grid size-8 shrink-0 place-items-end overflow-hidden rounded-neo-sm border-2 border-neo-black ${ACCENT_BG[mode.accent]}`}>
              <Image src={mode.poster} alt="" aria-hidden="true" width={32} height={32} className="h-full w-auto object-contain" />
            </span>
            <span className="font-neo-display text-sm font-black text-neo-white">{t(mode.nameKey)}</span>
            <DeliveryTag delivery={mode.delivery} t={t} className="bg-neo-cream/15" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default LandingModes;
