'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick, trackOnboardingOpenRequested } from '@/utils/growthTracking';

interface FreshPlayLinkProps {
  /** Opens OnboardingFlow. Absent (server HTML, no JS) → the link just navigates. */
  onPlay?: () => void;
  /** landing_cta_clicked `cta` value, so before/after funnels stay comparable. */
  cta: string;
  /**
   * URL locale for the href. Defaults to the language context. The finale
   * passes the locale prop its server component already has, so its href can
   * never drift from the page it is on.
   */
  locale?: string;
  /** Override the no-JS destination. Defaults to multiplayer. */
  href?: string;
  className?: string;
  children: ReactNode;
}

/**
 * PLAY is always a real `<a href="/{locale}/multiplayer">` (server HTML,
 * crawlers, no-JS). A mounted `onPlay` only upgrades the click, so the element
 * never swaps after hydration (the old mount-gated CTA was a CLS source).
 * Modified clicks (new tab/window) keep the native link behaviour.
 */
export function FreshPlayLink({ onPlay, cta, locale, href, className, children }: FreshPlayLinkProps) {
  const { language } = useLanguage();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // `opens_ftue` splits the PLAY funnel by cohort: the handler exists only
    // for new users (PageClient gates onStartOnboarding on isNewUser), so
    // false = returning-user native navigation by design, not gate loss.
    trackLandingCtaClick(cta, { opens_ftue: !!onPlay });
    // Same every-click accounting as PlayHero: clicks that resolve WITHOUT
    // requesting an onboarding open (no handler attached = returning user /
    // route-denied; or a modified click keeping native behaviour) still emit
    // `onboarding_open_requested` with allowed:false + `fallthrough`, so
    // cta_clicked − open_requested measures only true tracking loss instead
    // of the whole returning cohort. allowed:true fires from PageClient's
    // handleStartOnboarding on the upgrade path.
    if (!onPlay || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      trackOnboardingOpenRequested({
        allowed: false,
        fallthrough: onPlay ? 'modified_click' : 'native_nav',
      });
      return;
    }
    e.preventDefault();
    onPlay();
  };

  return (
    <Link href={href ?? `/${locale ?? language}/multiplayer`} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
