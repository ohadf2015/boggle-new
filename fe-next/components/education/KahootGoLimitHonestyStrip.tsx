/**
 * Education honesty strip (marketing foil, not a product feature):
 * Kahoot! Go Free participant limit — plans table says 40, same-page FAQ says 10
 * vs LexiClash clear free classroom seat cap (50).
 *
 * Evidence: https://kahoot.com/schools/plans/
 * Does NOT redo Kahoot Unplugged #1124 CTAs or touch #1125/#1126/#1127/#1131.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const EVIDENCE_URL = 'https://kahoot.com/schools/plans/';

export interface KahootGoLimitHonestyStripProps {
  locale?: string;
  className?: string;
}

export function KahootGoLimitHonestyStrip({
  locale,
  className,
}: KahootGoLimitHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="kahoot-go-limit-honesty-strip"
      aria-labelledby="kahoot-go-limit-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsKahoot.goLimit.eyebrow')}
      </p>
      <h2
        id="kahoot-go-limit-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsKahoot.goLimit.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsKahoot.goLimit.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="kahoot-go-limit-ambiguous-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsKahoot.goLimit.kahootTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsKahoot.goLimit.kahootBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-clear-limit-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsKahoot.goLimit.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsKahoot.goLimit.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsKahoot.goLimit.citePrefix')}{' '}
        <a
          href={EVIDENCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="kahoot-go-limit-evidence-link"
        >
          {t('education.vsKahoot.goLimit.citeLabel')}
        </a>
        {t('education.vsKahoot.goLimit.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="kahoot-go-limit-cta"
        >
          {t('education.vsKahoot.goLimit.cta')}
        </Link>
      </div>
    </section>
  );
}

export const KAHOOT_GO_LIMIT_EVIDENCE_URL = EVIDENCE_URL;
