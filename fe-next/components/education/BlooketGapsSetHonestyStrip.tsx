/**
 * Education honesty strip (marketing foil, not a product feature):
 * Blooket Opportunities-for-Growth / Incorrect% → manual 「Gaps Set」 rebuild
 * vs LexiClash auto miss-gap → reteach Live deep-link (#1124).
 *
 * Evidence: https://blooketapp.com/identify-knowledge-gaps-in-blooket-reports
 * Does NOT redo Kahoot Unplugged #1124 CTAs — cites the deep-link outcome only.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const EVIDENCE_URL =
  'https://blooketapp.com/identify-knowledge-gaps-in-blooket-reports';

export interface BlooketGapsSetHonestyStripProps {
  locale?: string;
  className?: string;
}

export function BlooketGapsSetHonestyStrip({
  locale,
  className,
}: BlooketGapsSetHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="blooket-gaps-set-honesty-strip"
      aria-labelledby="blooket-gaps-set-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsBlooket.gapsSet.eyebrow')}
      </p>
      <h2
        id="blooket-gaps-set-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsBlooket.gapsSet.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsBlooket.gapsSet.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="blooket-gaps-set-manual-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsBlooket.gapsSet.blooketTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsBlooket.gapsSet.blooketBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-miss-gap-deeplink-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsBlooket.gapsSet.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsBlooket.gapsSet.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsBlooket.gapsSet.citePrefix')}{' '}
        <a
          href={EVIDENCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="blooket-gaps-set-evidence-link"
        >
          {t('education.vsBlooket.gapsSet.citeLabel')}
        </a>
        {t('education.vsBlooket.gapsSet.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="blooket-gaps-set-cta"
        >
          {t('education.vsBlooket.gapsSet.cta')}
        </Link>
      </div>
    </section>
  );
}

export const BLOOKET_GAPS_SET_EVIDENCE_URL = EVIDENCE_URL;
