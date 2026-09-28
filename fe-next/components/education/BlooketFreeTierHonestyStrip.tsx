/**
 * Education honesty strip (marketing foil, not a product feature):
 * Blooket free Starter = up to 60 live players + homework 14-day deadline
 * (Plus → 300 players / 365d) vs LexiClash free whole-class 50 + miss→reteach Live.
 *
 * Evidence:
 *   https://help.blooket.com/hc/en-us/articles/17351034967959-Is-Blooket-Free
 *   https://help.blooket.com/hc/en-us/articles/16376933513879-Blooket-Plus-Features
 *   https://dashboard.blooket.com/upgrade
 *
 * Distinct from Gaps Set #1125, Gimkit#1137, Kahoot#1132, Wayground#1136.
 * CTA rule: LexiClash limits in CTAs only; competitor facts in honesty strip/body.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const IS_FREE_URL =
  'https://help.blooket.com/hc/en-us/articles/17351034967959-Is-Blooket-Free';
const PLUS_FEATURES_URL =
  'https://help.blooket.com/hc/en-us/articles/16376933513879-Blooket-Plus-Features';
const UPGRADE_URL = 'https://dashboard.blooket.com/upgrade';

export interface BlooketFreeTierHonestyStripProps {
  locale?: string;
  className?: string;
}

export function BlooketFreeTierHonestyStrip({
  locale,
  className,
}: BlooketFreeTierHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="blooket-free-tier-honesty-strip"
      aria-labelledby="blooket-free-tier-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsBlooket.freeTier.eyebrow')}
      </p>
      <h2
        id="blooket-free-tier-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsBlooket.freeTier.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsBlooket.freeTier.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="blooket-free-tier-caps-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsBlooket.freeTier.blooketTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsBlooket.freeTier.blooketBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-free-tier-50-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsBlooket.freeTier.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsBlooket.freeTier.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsBlooket.freeTier.citePrefix')}{' '}
        <a
          href={IS_FREE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="blooket-free-tier-is-free-link"
        >
          {t('education.vsBlooket.freeTier.citeIsFreeLabel')}
        </a>
        {' · '}
        <a
          href={PLUS_FEATURES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="blooket-free-tier-plus-link"
        >
          {t('education.vsBlooket.freeTier.citePlusLabel')}
        </a>
        {' · '}
        <a
          href={UPGRADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="blooket-free-tier-upgrade-link"
        >
          {t('education.vsBlooket.freeTier.citeUpgradeLabel')}
        </a>
        {t('education.vsBlooket.freeTier.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="blooket-free-tier-cta"
        >
          {t('education.vsBlooket.freeTier.cta')}
        </Link>
      </div>
    </section>
  );
}

export const BLOOKET_FREE_TIER_IS_FREE_URL = IS_FREE_URL;
export const BLOOKET_FREE_TIER_PLUS_URL = PLUS_FEATURES_URL;
export const BLOOKET_FREE_TIER_UPGRADE_URL = UPGRADE_URL;
