/**
 * Education honesty strip (marketing foil, not a product feature):
 * Gimkit Basic — Pro-Exclusive modes limited to 5 players
 * vs LexiClash whole-class free vocab (clear free seat cap).
 *
 * Evidence:
 *   https://help.gimkit.com/en/article/player-maximums-18mbcz0/
 *   https://help.gimkit.com/en/article/gimkit-pro-faq-14h6d62/
 *
 * Distinct from Wayground Starter 20-activity #1136, Kahoot Go Free 40vs10 #1132,
 * and Blooket Gaps #1125.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PLAYER_MAXIMUMS_URL =
  'https://help.gimkit.com/en/article/player-maximums-18mbcz0/';
const PRO_FAQ_URL = 'https://help.gimkit.com/en/article/gimkit-pro-faq-14h6d62/';

export interface GimkitProExclusiveModesHonestyStripProps {
  locale?: string;
  className?: string;
}

export function GimkitProExclusiveModesHonestyStrip({
  locale,
  className,
}: GimkitProExclusiveModesHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="gimkit-pro-exclusive-modes-honesty-strip"
      aria-labelledby="gimkit-pro-exclusive-modes-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsGimkit.proExclusiveModes.eyebrow')}
      </p>
      <h2
        id="gimkit-pro-exclusive-modes-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsGimkit.proExclusiveModes.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsGimkit.proExclusiveModes.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="gimkit-pro-exclusive-modes-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsGimkit.proExclusiveModes.gimkitTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsGimkit.proExclusiveModes.gimkitBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-whole-class-vocab-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsGimkit.proExclusiveModes.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsGimkit.proExclusiveModes.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsGimkit.proExclusiveModes.citePrefix')}{' '}
        <a
          href={PLAYER_MAXIMUMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="gimkit-player-maximums-evidence-link"
        >
          {t('education.vsGimkit.proExclusiveModes.citePlayerMaximumsLabel')}
        </a>
        {' · '}
        <a
          href={PRO_FAQ_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="gimkit-pro-faq-evidence-link"
        >
          {t('education.vsGimkit.proExclusiveModes.citeProFaqLabel')}
        </a>
        {t('education.vsGimkit.proExclusiveModes.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="gimkit-pro-exclusive-modes-cta"
        >
          {t('education.vsGimkit.proExclusiveModes.cta')}
        </Link>
      </div>
    </section>
  );
}

export const GIMKIT_PLAYER_MAXIMUMS_EVIDENCE_URL = PLAYER_MAXIMUMS_URL;
export const GIMKIT_PRO_FAQ_EVIDENCE_URL = PRO_FAQ_URL;
