/**
 * Education honesty strip (marketing foil, not a product feature):
 * Nearpod Silver free = 40 student joins per lesson + 300 MB storage
 * (Gold 75 / Platinum 90 / School·District 250) vs LexiClash whole-class free 50
 * + miss→reteach Live.
 *
 * Evidence: https://nearpod.com/pricing
 *
 * Distinct from Blooket#1166, Wayground#1136, Gimkit#1137, Kahoot#1132, Blooket Gaps#1125.
 * CTA rule: LexiClash 50-seat limits in CTAs only; competitor caps only in strip/body.
 * JA competitor facts use プレイヤー (not 人) so freeTierCopy.i18n stays green.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PRICING_URL = 'https://nearpod.com/pricing';

export interface NearpodSilverFreeTierHonestyStripProps {
  locale?: string;
  className?: string;
}

export function NearpodSilverFreeTierHonestyStrip({
  locale,
  className,
}: NearpodSilverFreeTierHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="nearpod-silver-free-tier-honesty-strip"
      aria-labelledby="nearpod-silver-free-tier-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsNearpod.silverFree.eyebrow')}
      </p>
      <h2
        id="nearpod-silver-free-tier-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsNearpod.silverFree.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsNearpod.silverFree.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="nearpod-silver-free-caps-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsNearpod.silverFree.nearpodTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsNearpod.silverFree.nearpodBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-nearpod-free-tier-50-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsNearpod.silverFree.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsNearpod.silverFree.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsNearpod.silverFree.citePrefix')}{' '}
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="nearpod-silver-pricing-link"
        >
          {t('education.vsNearpod.silverFree.citePricingLabel')}
        </a>
        {t('education.vsNearpod.silverFree.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="nearpod-silver-free-tier-cta"
        >
          {t('education.vsNearpod.silverFree.cta')}
        </Link>
      </div>
    </section>
  );
}

export const NEARPOD_SILVER_PRICING_URL = PRICING_URL;
