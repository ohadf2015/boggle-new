'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Heart, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { relicArt } from '@/components/adventure/play/run/art';
import { MAP_ROWS } from '@/lib/adventure/play/runMap';
import { trackGrowthEvent, trackLandingCtaClick, trackModeSelected } from '@/utils/growthTracking';
import { useAdventureResume } from '../useAdventureResume';
import { useHomeLaunch } from './HomeLaunch';

const ART = '/modes/cubes/adventure.png';
const MAX_RELICS = 3;

/**
 * Full-width Adventure door under the daily hero. The run resolves from storage
 * after hydration, so the box has a fixed height and only its contents swap.
 */
export function HomeAdventureCard() {
  const { t, language } = useLanguage();
  const launch = useHomeLaunch();
  const resume = useAdventureResume(true);
  const href = resume ? `/${language}/adventure?world=${resume.world}` : `/${language}/adventure`;
  const title = resume ? t('landing.home.adventureContinueTitle') : t('landing.home.adventureStartTitle');
  const cta = resume ? t('landing.home.adventureContinueCta') : t('landing.home.adventureStartCta');
  const label = resume
    ? t('landing.adventureResumeA11y', { world: resume.world, step: resume.step, hp: resume.hp })
    : `${title}: ${t('landing.adventureModeDesc')}`;

  return (
    <Link
      href={href}
      prefetch={false}
      data-testid="home-adventure-card"
      data-state={resume ? 'resume' : 'invite'}
      aria-label={label}
      onPointerEnter={() => launch?.prefetch(href)}
      onPointerDown={() => launch?.prefetch(href)}
      onClick={(e) => {
        trackModeSelected('adventure', 'home');
        trackGrowthEvent('featured_mode_card_clicked', { mode: 'adventure', surface: 'home' });
        trackLandingCtaClick('adventure_card', { mode: 'adventure', resume: !!resume, ...(resume && { world: resume.world }) });
        launch?.start(e, { href, tone: 'lime', title: t('landing.adventureMode'), art: ART });
      }}
      className={cn(
        'group relative flex h-28 items-center gap-3 overflow-hidden rounded-2xl border-[3px] border-black bg-neo-lime p-2.5 pe-3 text-neo-navy shadow-hard lg:rounded-3xl lg:shadow-hard-lg',
        'transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        'lg:h-40 lg:gap-5 lg:p-3 lg:pe-5',
      )}
    >
      <span aria-hidden="true" className="relative aspect-square h-full shrink-0 overflow-hidden rounded-xl border-[3px] border-black bg-neo-navy">
        <Image src={ART} alt="" fill sizes="(min-width: 1024px) 128px, 86px" className="object-cover" />
      </span>

      <span aria-hidden="true" className="flex min-w-0 flex-1 flex-col justify-center gap-1 lg:gap-2">
        <span className="hidden w-fit items-center rounded-neo-pill bg-black px-2.5 py-0.5 font-neo-display text-xs font-bold uppercase tracking-wide text-neo-lime lg:inline-flex">
          {t('landing.adventureMode')}
        </span>
        <span className="line-clamp-2 font-neo-display text-lg font-bold leading-tight lg:text-3xl">{title}</span>
        {resume ? (
          <span className="flex min-w-0 flex-wrap items-center gap-1.5 lg:gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-neo-navy px-2 py-0.5 font-neo-display text-[0.7rem] font-black leading-none text-neo-lime lg:text-sm">
              <Play className="h-2.5 w-2.5 fill-neo-lime rtl:rotate-180 lg:h-3 lg:w-3" strokeWidth={3} />
              <span>{t('landing.home.adventureRunProgress', { world: resume.world, step: resume.step, total: MAP_ROWS })}</span>
            </span>
            <span
              data-testid="home-adventure-hearts"
              className="inline-flex items-center gap-0.5 rounded-full border-2 border-black bg-neo-navy px-1.5 py-0.5 font-neo-display text-[0.7rem] font-black leading-none text-neo-pink lg:text-sm"
            >
              <Heart className="h-2.5 w-2.5 fill-neo-pink lg:h-3 lg:w-3" strokeWidth={2.5} />
              <span dir="ltr">{resume.hp}/{resume.maxHp}</span>
            </span>
            {resume.relics.length > 0 && (
              <span data-testid="home-adventure-relics" className="flex items-center gap-0.5">
                {resume.relics.slice(0, MAX_RELICS).map((id) => (
                  // eslint-disable-next-line @next/next/no-img-element -- tiny static relic art, same as the mode cube's resume chip
                  <img key={id} src={relicArt(id)} alt="" draggable={false} className="h-5 w-5 rounded border-2 border-black bg-neo-navy lg:h-6 lg:w-6" />
                ))}
                {resume.relics.length > MAX_RELICS && (
                  <span className="rounded border-2 border-black bg-neo-navy px-1 py-0.5 font-neo-display text-[0.6rem] font-black leading-none text-neo-cream" dir="ltr">
                    +{resume.relics.length - MAX_RELICS}
                  </span>
                )}
              </span>
            )}
          </span>
        ) : (
          <span className="line-clamp-1 font-neo-body text-xs font-semibold text-neo-navy/80 lg:text-lg">{t('landing.adventureModeDesc')}</span>
        )}
      </span>

      <span
        aria-hidden="true"
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-black px-3 font-neo-display text-sm font-bold text-neo-lime lg:h-12 lg:px-5 lg:text-lg"
      >
        <span className="hidden sm:inline">{cta}</span>
        <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
      </span>

      {resume && (
        <span data-testid="home-adventure-rail" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-black/25">
          <span className="block h-full bg-neo-navy" style={{ width: `${Math.round((resume.step / MAP_ROWS) * 100)}%` }} />
        </span>
      )}
    </Link>
  );
}

export default HomeAdventureCard;
