'use client';

import { useRef, type RefObject } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { ProBadge } from '@/components/ui/ProBadge';

/** Surfaces where a free teacher sees real class data first and Pro second. */
export type ProInsightPlacement = 'analytics_week_insight' | 'results_hardest_words' | 'home_class_insight';

interface ProInsightLinkProps {
  placement: ProInsightPlacement;
  language: string;
  label: string;
  proLabel: string;
  href?: string;
  /** False while the link sits in something closed: no impression until it can be seen. */
  active?: boolean;
  className?: string;
}

/** Viewed (half on screen, never on mount) and click twins for a free-insight Pro surface. Returns the tap handler. */
export function useProInsightOffer(ref: RefObject<Element | null>, placement: ProInsightPlacement, language: string, active: boolean): () => void {
  const { user } = useAuth();
  const { known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const offer = resolveProOffer(language, { known, trialUsed, accessTrialExpires, accessTrialEnded }, resultsTrialCopy(language));
  const base = { placement, locale: language, cta: offer.cta, offer: offer.offer };
  const baseRef = useRef(base);
  baseRef.current = base;
  const userId = user?.id ?? null;

  useUpsellImpression(ref, active ? { cta: 'teacher_pro', placement } : null, { locale: language }, () =>
    reportProOfferImpression({ ...baseRef.current, stage: 'viewed' }, { userId }),
  );

  return () => {
    try {
      trackGrowthEvent('landing_cta_clicked', { cta: placement, source: placement });
      reportProOfferClick(baseRef.current);
    } catch {
      /* analytics must never block */
    }
  };
}

/** The one quiet "more with Pro" line under a free insight. */
export function ProInsightLink({ placement, language, label, proLabel, href, active = true, className }: ProInsightLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onClick = useProInsightOffer(ref, placement, language, active);

  return (
    <Link
      ref={ref}
      href={href ?? `/${language}/teacher/upgrade?source=${placement}`}
      data-testid={`pro-insight-link-${placement}`}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 self-start rounded-neo border-[2px] border-neo-cream/60 px-3 py-1 font-neo-body text-sm font-bold text-neo-cream transition-colors hover:border-neo-cream hover:bg-neo-cream/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
        className,
      )}
    >
      <ProBadge size="xs" label={proLabel} />
      <span className="min-w-0">{label}</span>
      <ChevronRight className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
    </Link>
  );
}
