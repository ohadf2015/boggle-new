'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import { FreshSection } from './FreshSection';
import s from './FreshMotion.module.css';

/**
 * Section 6: classrooms → /education (demoted from the old classroom h1, not
 * deleted, still a strong teacher CTA). Round 4: it joins the open layout of
 * sections 2-5 (headline, line, art, one purple button) instead of a filled
 * purple slab, so the page no longer runs purple slab straight into the lime
 * close card. The fan of teacher badges opens on hover.
 *
 * Hidden inside CrazyGames so the embed never links off-platform. Only a
 * CONFIRMED CrazyGames env hides it: web visitors keep it in the server HTML
 * and first paint (hiding while the SDK resolves would shift the page).
 */
export function FreshClassrooms() {
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform, isLoading } = useCrazyGames();
  if (isOnCrazyGamesPlatform && !isLoading) return null;

  return (
    <FreshSection
      id="classrooms"
      accent="purple"
      title={t('homeFresh.sections.classrooms.title')}
      line={t('homeFresh.sections.classrooms.line')}
      link={{ href: `/${language}/education`, label: t('homeFresh.sections.classrooms.cta') }}
      art={
        <div
          data-fresh-art="badges"
          aria-hidden="true"
          className={cn('relative mx-auto grid h-56 w-full max-w-[380px] place-items-center md:h-80', s.badgeFan)}
        >
          {[
            { art: 'bg-[url(/home/shell/class-projector.webp)]', cls: s.badgeBack },
            { art: 'bg-[url(/home/shell/class-go-live.webp)]', cls: s.badgeBackAlt },
            { art: 'bg-[url(/home/shell/class-full-house.webp)]', cls: cn('z-10', s.badgeFront) },
          ].map((b) => (
            <div
              key={b.art}
              className={cn(
                'col-start-1 row-start-1 aspect-square w-56 bg-contain bg-center bg-no-repeat drop-shadow-[4px_4px_0_rgb(0_0_0)] md:w-72',
                b.art,
                b.cls
              )}
            />
          ))}
        </div>
      }
    />
  );
}
