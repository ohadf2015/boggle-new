/**
 * Education honesty strip (marketing foil, not a product feature):
 * Wooclap Starter = free up to 5 active questions / 30 days.
 * Active = 3+ responses from unique participants; >5 active in 30 days → upgrade.
 * Pricing page says "5 questions per month" + "Unlimited participants" on Starter;
 * Help (June 2, 2026) clarifies the 5-active / 30-day meter (not a participant cap).
 * Up to 1000 participants on all plans.
 *
 * Evidence:
 * - https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing
 * - https://www.wooclap.com/en/pricing/pricing-education/
 *
 * Foil: LexiClash free classroom play without Wooclap's active-question meter
 * (question-quota honesty, not participant cap).
 * Distinct from Mentimeter#1183, Nearpod Silver#1169, Blooket, Gimkit, Wayground, Kahoot Go.
 * CTA rule: LexiClash free-classroom limits in CTAs only; competitor caps only in strip/body.
 * Prod domain is lexiclash.live (never lexiclash.com).
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const HELP_URL =
  'https://docs.wooclap.com/en/articles/14402104-what-is-wooclap-s-pricing';
const PLANS_URL = 'https://www.wooclap.com/en/pricing/pricing-education/';

export interface WooclapStarterHonestyStripProps {
  locale?: string;
  className?: string;
}

export function WooclapStarterHonestyStrip({
  locale,
  className,
}: WooclapStarterHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="wooclap-starter-honesty-strip"
      aria-labelledby="wooclap-starter-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsWooclap.starter5.eyebrow')}
      </p>
      <h2
        id="wooclap-starter-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsWooclap.starter5.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsWooclap.starter5.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="wooclap-starter-5-caps-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsWooclap.starter5.wooTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsWooclap.starter5.wooBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-wooclap-starter-5-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsWooclap.starter5.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsWooclap.starter5.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsWooclap.starter5.citePrefix')}{' '}
        <a
          href={HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="wooclap-starter-help-link"
        >
          {t('education.vsWooclap.starter5.citeHelpLabel')}
        </a>
        {' · '}
        <a
          href={PLANS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="wooclap-starter-plans-link"
        >
          {t('education.vsWooclap.starter5.citePlansLabel')}
        </a>
        {t('education.vsWooclap.starter5.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="wooclap-starter-cta"
        >
          {t('education.vsWooclap.starter5.cta')}
        </Link>
      </div>
    </section>
  );
}

export const WOOCLAP_STARTER_HELP_URL = HELP_URL;
export const WOOCLAP_STARTER_PLANS_URL = PLANS_URL;
