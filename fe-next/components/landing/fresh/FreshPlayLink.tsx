'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';

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
  className?: string;
  children: ReactNode;
}

/**
 * PLAY is always a real `<a href="/{locale}/multiplayer">` (server HTML,
 * crawlers, no-JS). A mounted `onPlay` only upgrades the click, so the element
 * never swaps after hydration (the old mount-gated CTA was a CLS source).
 * Modified clicks (new tab/window) keep the native link behaviour.
 */
export function FreshPlayLink({ onPlay, cta, locale, className, children }: FreshPlayLinkProps) {
  const { language } = useLanguage();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackLandingCtaClick(cta);
    if (!onPlay || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onPlay();
  };

  return (
    <Link href={`/${locale ?? language}/multiplayer`} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
