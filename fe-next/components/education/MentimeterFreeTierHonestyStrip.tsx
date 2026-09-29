/**
 * Education honesty strip (marketing foil, not a product feature):
 * Mentimeter Free = 50 participants per month (pricing table + Help),
 * counter resets on account-creation date; one presentation may exceed 50
 * with an 8-hour grace, then blocked. Free marketing bullets say
 * "Unlimited participants once per month" while the pricing table lists 50.
 *
 * Evidence:
 * - https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account
 * - https://www.mentimeter.com/plans?view=standard
 *
 * Distinct from Nearpod#1169, Blooket#1166, Gimkit#1137, Wayground, Kahoot Go Free.
 * CTA rule: LexiClash 50-seat limits in CTAs only; competitor caps only in strip/body.
 * Prod domain is lexiclash.live (never lexiclash.com).
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const HELP_URL =
  'https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account';
const PLANS_URL = 'https://www.mentimeter.com/plans?view=standard';

export interface MentimeterFreeTierHonestyStripProps {
  locale?: string;
  className?: string;
}

export function MentimeterFreeTierHonestyStrip({
  locale,
  className,
}: MentimeterFreeTierHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="mentimeter-free-tier-honesty-strip"
      aria-labelledby="mentimeter-free-tier-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsMentimeter.free50.eyebrow')}
      </p>
      <h2
        id="mentimeter-free-tier-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsMentimeter.free50.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsMentimeter.free50.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="mentimeter-free-50-caps-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsMentimeter.free50.mentiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsMentimeter.free50.mentiBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-mentimeter-free-tier-50-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsMentimeter.free50.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsMentimeter.free50.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsMentimeter.free50.citePrefix')}{' '}
        <a
          href={HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="mentimeter-free-help-link"
        >
          {t('education.vsMentimeter.free50.citeHelpLabel')}
        </a>
        {' · '}
        <a
          href={PLANS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="mentimeter-free-plans-link"
        >
          {t('education.vsMentimeter.free50.citePlansLabel')}
        </a>
        {t('education.vsMentimeter.free50.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="mentimeter-free-tier-cta"
        >
          {t('education.vsMentimeter.free50.cta')}
        </Link>
      </div>
    </section>
  );
}

export const MENTIMETER_FREE_HELP_URL = HELP_URL;
export const MENTIMETER_FREE_PLANS_URL = PLANS_URL;
