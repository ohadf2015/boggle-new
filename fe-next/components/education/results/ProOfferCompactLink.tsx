/**
 * The Teacher Pro offer after the session cap is used (proOfferSession.ts): one quiet
 * line with the same single-trial label (resolveProOffer) and the same destination
 * as the full card, instead of the card again. Its server twins carry
 * `format: 'link'` so the funnel reads card and link apart.
 */
'use client';

import { useEffect, useRef, type Ref } from 'react';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reportProCtaClick, reportProOfferClick, reportProOfferImpression, type ProOfferKind } from '@/lib/education/reportProCtaClick';
import { trackGrowthEvent } from '@/utils/growthTracking';

export interface ProOfferCompactLinkProps {
  label: string;
  placement: string;
  language: string;
  cta: string;
  offer: ProOfferKind;
  userId: string | null;
  variant?: string;
  /** Link target; omit and pass onActivate for a button (dashboard starts checkout directly). */
  href?: string;
  onActivate?: () => void;
  pending?: boolean;
  className?: string;
}

const CLASS =
  'inline-flex min-h-11 items-center gap-1.5 self-start rounded-neo px-1 text-start font-neo-display text-sm font-bold text-neo-pink-light underline underline-offset-2 hover:text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:opacity-60';

export function ProOfferCompactLink({ label, placement, language, cta, offer, userId, variant, href, onActivate, pending, className }: ProOfferCompactLinkProps) {
  const argsRef = useRef({ placement, locale: language, cta, offer, format: 'link' as const });
  argsRef.current = { placement, locale: language, cta, offer, format: 'link' as const };
  const linkRef = useRef<Element | null>(null);
  useEffect(() => {
    reportProOfferImpression({ ...argsRef.current, stage: 'rendered' }, { userId });
  }, [userId]);
  useUpsellImpression(
    linkRef,
    { cta, placement },
    { locale: language, format: 'link' },
    () => reportProOfferImpression({ ...argsRef.current, stage: 'viewed' }, { userId }),
  );

  const onClick = () => {
    try {
      trackGrowthEvent('landing_cta_clicked', { cta, source: placement, format: 'link' });
      reportProCtaClick({ placement, locale: language, cta });
      reportProOfferClick(argsRef.current);
    } catch {
      /* analytics must never block */
    }
    onActivate?.();
  };
  const content = (
    <>
      <Sparkles className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </>
  );
  const common = {
    'data-testid': 'teacher-pro-offer-compact',
    'data-placement': placement,
    'data-variant': variant,
    'data-offer': offer,
    className: cn(CLASS, className),
  };
  return href ? (
    <Link href={href} ref={linkRef as Ref<HTMLAnchorElement>} onClick={onClick} {...common}>
      {content}
    </Link>
  ) : (
    <button type="button" ref={linkRef as Ref<HTMLButtonElement>} onClick={onClick} disabled={pending} aria-busy={pending || undefined} {...common}>
      {content}
    </button>
  );
}

export default ProOfferCompactLink;
