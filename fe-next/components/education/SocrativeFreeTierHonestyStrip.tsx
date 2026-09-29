/**
 * Education honesty strip (marketing foil, not a product feature):
 * Socrative Free = 5 Quizzes / 1 Room / 50 students per activity
 * (verified live on socrative.com/pricing — Free plan bullets).
 *
 * Distinct from Wayground Basic 20 max storage (#1189), Mentimeter Free 50/month
 * (#1183), Wooclap Starter 5 active (#1186), Nearpod#1169, Blooket#1166, Gimkit#1137.
 * CTA rule: LexiClash 50-seat limits in CTAs only; competitor caps only in strip/body.
 * Prod domain is lexiclash.live (never lexiclash.com).
 * Skip open #1187 (CTR titles) — separate worktree.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PRICING_URL = 'https://www.socrative.com/pricing';
const HELP_URL =
  'https://help.socrative.com/en/articles/8228775-choosing-the-right-socrative-plan';

export interface SocrativeFreeTierHonestyStripProps {
  locale?: string;
  className?: string;
}

export function SocrativeFreeTierHonestyStrip({
  locale,
  className,
}: SocrativeFreeTierHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="socrative-free-tier-honesty-strip"
      aria-labelledby="socrative-free-tier-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsSocrative.freeTier.eyebrow')}
      </p>
      <h2
        id="socrative-free-tier-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsSocrative.freeTier.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsSocrative.freeTier.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="socrative-free-5-1-50-caps-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsSocrative.freeTier.socTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsSocrative.freeTier.socBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-socrative-free-tier-50-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsSocrative.freeTier.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsSocrative.freeTier.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsSocrative.freeTier.citePrefix')}{' '}
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="socrative-free-pricing-link"
        >
          {t('education.vsSocrative.freeTier.citePlansLabel')}
        </a>
        {' · '}
        <a
          href={HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="socrative-free-help-link"
        >
          {t('education.vsSocrative.freeTier.citeHelpLabel')}
        </a>
        {t('education.vsSocrative.freeTier.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="socrative-free-tier-cta"
        >
          {t('education.vsSocrative.freeTier.cta')}
        </Link>
      </div>
    </section>
  );
}

export const SOCRATIVE_FREE_PRICING_URL = PRICING_URL;
export const SOCRATIVE_FREE_HELP_URL = HELP_URL;
