/**
 * Education honesty strip (marketing foil, not a product feature):
 * ClassPoint Basic Free = Max 25 class size / 5 Questions per PPT / 5 Question types /
 * 3 Draggable objects / 3 saved classes
 * (verified live on classpoint.io/pricing — Basic Free bullets, lastChecked 2026-09-29).
 *
 * Distinct from Socrative Free 5/1/50 (#1190), Wayground Basic 20 max (#1189), Mentimeter
 * Free 50/month (#1183), Wooclap Starter 5 active (#1186), Nearpod#1169, Blooket#1166,
 * Gimkit#1137. Do NOT reopen those strips.
 * CTA rule: LexiClash 50-seat limits in CTAs only; competitor caps only in strip/body.
 * Prod domain is lexiclash.live (never lexiclash.com).
 * Skip open #1187 (CTR titles) — separate worktree.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PRICING_URL = 'https://www.classpoint.io/pricing';
const SCHOOLS_URL = 'https://www.classpoint.io/schools-districts';

export interface ClassPointBasicFreeHonestyStripProps {
  locale?: string;
  className?: string;
}

export function ClassPointBasicFreeHonestyStrip({
  locale,
  className,
}: ClassPointBasicFreeHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="classpoint-basic-free-honesty-strip"
      aria-labelledby="classpoint-basic-free-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsClassPoint.basicFree.eyebrow')}
      </p>
      <h2
        id="classpoint-basic-free-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsClassPoint.basicFree.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsClassPoint.basicFree.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="classpoint-basic-free-25-5q-caps-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsClassPoint.basicFree.cpTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsClassPoint.basicFree.cpBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-classpoint-basic-free-50-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsClassPoint.basicFree.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsClassPoint.basicFree.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsClassPoint.basicFree.citePrefix')}{' '}
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="classpoint-basic-free-pricing-link"
        >
          {t('education.vsClassPoint.basicFree.citePlansLabel')}
        </a>
        {' · '}
        <a
          href={SCHOOLS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="classpoint-basic-free-schools-link"
        >
          {t('education.vsClassPoint.basicFree.citeSchoolsLabel')}
        </a>
        {t('education.vsClassPoint.basicFree.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="classpoint-basic-free-cta"
        >
          {t('education.vsClassPoint.basicFree.cta')}
        </Link>
      </div>
    </section>
  );
}

export const CLASSPOINT_BASIC_FREE_PRICING_URL = PRICING_URL;
export const CLASSPOINT_BASIC_FREE_SCHOOLS_URL = SCHOOLS_URL;
