/**
 * "Get a school quote" beside the locked "Export class report (PDF)" on the classroom
 * round-results wall, for a free teacher who runs 3+ classes: that teacher is the
 * likeliest to bring colleagues, so the Schools plan ($49/teacher/year, invoice) sits
 * next to the $9/mo ask instead of replacing it.
 *
 * Goes to the existing /education/for-schools quote path. Tracked with the existing
 * school-quote click (`landing_cta_clicked {cta: 'district_upsell', source}`) and the
 * existing impression (`education_upsell_impression {cta: 'district_upsell', placement}`),
 * placement `results_school_quote`. Copy is the results card's quote copy (6 languages),
 * so the price can never drift from SCHOOL_PRICING. Opens a new tab: leaving the
 * projector tab would drop the live room.
 */
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherClassCount } from '@/hooks/useTeacherClassCount';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';

export const RESULTS_SCHOOL_QUOTE_PLACEMENT = 'results_school_quote' as const;
/** Classes a teacher needs before the school quote shows. */
export const SCHOOL_QUOTE_MIN_CLASSES = 3;

export function schoolQuoteHref(language: string): string {
  return `/${language}/education/for-schools?source=${RESULTS_SCHOOL_QUOTE_PLACEMENT}`;
}

export function ResultsSchoolQuoteLink({ language, className }: { language: string; className?: string }) {
  const classCount = useTeacherClassCount();
  const show = classCount !== null && classCount >= SCHOOL_QUOTE_MIN_CLASSES;
  const ref = useRef<HTMLParagraphElement>(null);
  useUpsellImpression(ref, show ? { cta: 'district_upsell', placement: RESULTS_SCHOOL_QUOTE_PLACEMENT } : null, { locale: language });
  if (!show) return null;
  const copy = resultsTrialCopy(language);
  return (
    <p ref={ref} data-testid="results-school-quote" className={cn('text-center text-xs text-neo-cream/80 @[96rem]/results:text-sm', className)}>
      <Link
        href={schoolQuoteHref(language)}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="results-school-quote-pdf-link"
        data-placement={RESULTS_SCHOOL_QUOTE_PLACEMENT}
        onClick={() => {
          try {
            trackGrowthEvent('landing_cta_clicked', { cta: 'district_upsell', source: RESULTS_SCHOOL_QUOTE_PLACEMENT, locale: language });
          } catch {
            /* analytics must never block */
          }
        }}
        className="inline-flex min-h-11 items-center gap-1 font-bold text-neo-cream underline underline-offset-2 hover:text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        <Building2 className="size-[1.1em] shrink-0" aria-hidden="true" />
        {copy.quoteCta}
      </Link>
      <span className="block">{copy.quoteNote}</span>
    </p>
  );
}

export default ResultsSchoolQuoteLink;
