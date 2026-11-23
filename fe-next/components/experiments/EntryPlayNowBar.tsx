'use client';

/**
 * Growth Radar experiment `lexiclash-hero-play-cta` on the SEO entry pages (the
 * homepage runs it inside PlayHero). New visitors only: no finished onboarding,
 * no session, not a crawler, not CrazyGames. Control renders nothing; treatment
 * shows one fixed "Play now · Free, no sign-up" pill above the tab bar. It is
 * fixed-position, so it never moves the page (no CLS), and it can be dismissed.
 * getFlag (the exposure) is only called for eligible visitors on a listed page.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Play, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGrowthRadarFlag } from '@/hooks/useGrowthRadarFlag';
import { HERO_PLAY_CTA_KEY, entryPlayNowHref, heroPrimaryIsSolo } from '@/lib/experiments/heroPlayCta';
import { isReturningVisitor } from '@/utils/onboardingStorage';
import { isCrawler } from '@/lib/seo/isCrawler';
import { detectCrazyGamesSync } from '@/components/CrazyGamesSDK';
import { trackLandingCtaClick } from '@/utils/growthTracking';

function isEligibleVisitor(): boolean {
  try {
    return !isCrawler() && !isReturningVisitor() && !detectCrazyGamesSync();
  } catch {
    return false;
  }
}

export function EntryPlayNowBar() {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const href = entryPlayNowHref(pathname, language);
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setEligible(!!href && isEligibleVisitor());
  }, [href]);
  const variant = useGrowthRadarFlag(HERO_PLAY_CTA_KEY, eligible);
  if (!href || !eligible || dismissed || !heroPrimaryIsSolo(variant)) return null;

  return (
    <div
      data-testid="entry-play-now"
      data-variant="treatment"
      className="fixed inset-x-0 z-[70] flex justify-center px-3"
      style={{ bottom: 'calc(var(--bottom-nav-height, 0px) + 12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border-[3px] border-black bg-neo-lime p-1.5 text-black shadow-hard-lg">
        <Link
          href={href}
          onClick={() => trackLandingCtaClick('entry_play_now', { path: pathname ?? '' })}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <Play className="h-6 w-6 shrink-0" strokeWidth={2.75} aria-hidden="true" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-neo-display text-lg font-bold">{t('homePlay.playNow')}</span>
            <span className="truncate text-xs font-bold">{t('homePlay.playNowSub')}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('common.close', 'Close')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-black/10 focus-visible:outline-3 focus-visible:outline-black"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default EntryPlayNowBar;
