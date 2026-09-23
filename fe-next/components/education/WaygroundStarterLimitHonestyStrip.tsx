/**
 * Education honesty strip (marketing foil, not a product feature):
 * Wayground (Quizizz) Starter plan — 20 activity library limit
 * vs LexiClash classroom reteach / Live (no 20-resource library ceiling).
 *
 * Evidence: https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan
 * Updated 12 May 2026 — “20 activity limit: Store up to 20 resources”
 *
 * Distinct from Kahoot Go Free 40vs10 FAQ #1132 and Blooket Gaps #1125.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const EVIDENCE_URL =
  'https://help.wayground.com/support/solutions/articles/158000404038-wayground-starter-basic-plan';

export interface WaygroundStarterLimitHonestyStripProps {
  locale?: string;
  className?: string;
}

export function WaygroundStarterLimitHonestyStrip({
  locale,
  className,
}: WaygroundStarterLimitHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="wayground-starter-limit-honesty-strip"
      aria-labelledby="wayground-starter-limit-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsWayground.starterLimit.eyebrow')}
      </p>
      <h2
        id="wayground-starter-limit-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsWayground.starterLimit.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsWayground.starterLimit.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="wayground-starter-limit-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsWayground.starterLimit.waygroundTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsWayground.starterLimit.waygroundBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-reteach-live-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsWayground.starterLimit.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsWayground.starterLimit.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsWayground.starterLimit.citePrefix')}{' '}
        <a
          href={EVIDENCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="wayground-starter-limit-evidence-link"
        >
          {t('education.vsWayground.starterLimit.citeLabel')}
        </a>
        {t('education.vsWayground.starterLimit.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="wayground-starter-limit-cta"
        >
          {t('education.vsWayground.starterLimit.cta')}
        </Link>
      </div>
    </section>
  );
}

export const WAYGROUND_STARTER_LIMIT_EVIDENCE_URL = EVIDENCE_URL;
