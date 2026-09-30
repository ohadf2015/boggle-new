/**
 * Education honesty strip (marketing foil, not a product feature):
 * Padlet Neon Free = 3 active padlets + 20MB upload/file (+ 1 user, 2-min video /
 * 5-min audio recordings). Platinum unlocks unlimited padlets + 500MB uploads.
 * (verified live on padlet.help …/is-it-free + padlet.com/site/subscriptions
 * — lastChecked 2026-09-30).
 *
 * Distinct from PearDeck Teacher Free named-response (#1205), Nearpod Silver (#1169),
 * Mentimeter Free 50/month (#1183), Wayground Starter (#1189), Kahoot Go (#1132),
 * Socrative Free (#1196), ClassPoint Basic Free (#1202). Do NOT reopen those.
 * Do NOT touch open #1204 audio PR.
 * CTA rule: LexiClash 50-seat limits in CTAs only; competitor caps only in strip/body.
 * Prod domain is lexiclash.live (never lexiclash.com).
 * Mentimeter-safe boot (hotfix#1195 lesson): revalidate 86400, light client strip,
 * light server page — mirror PearDeck#1205 / ClassPoint#1202. ONE page only.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const HELP_URL = 'https://padlet.help/l/en/article/d7d009lugq-is-it-free';
const SUBS_URL = 'https://padlet.com/site/subscriptions';

export interface PadletNeonFreeHonestyStripProps {
  locale?: string;
  className?: string;
}

export function PadletNeonFreeHonestyStrip({
  locale,
  className,
}: PadletNeonFreeHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="padlet-neon-free-honesty-strip"
      aria-labelledby="padlet-neon-free-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsPadlet.neonFree.eyebrow')}
      </p>
      <h2
        id="padlet-neon-free-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsPadlet.neonFree.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsPadlet.neonFree.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="padlet-neon-free-caps-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsPadlet.neonFree.padletTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsPadlet.neonFree.padletBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-padlet-neon-free-foil-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsPadlet.neonFree.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsPadlet.neonFree.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsPadlet.neonFree.citePrefix')}{' '}
        <a
          href={HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="padlet-neon-free-help-link"
        >
          {t('education.vsPadlet.neonFree.citeHelpLabel')}
        </a>
        {' · '}
        <a
          href={SUBS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="padlet-neon-free-subs-link"
        >
          {t('education.vsPadlet.neonFree.citeSubsLabel')}
        </a>
        {t('education.vsPadlet.neonFree.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="padlet-neon-free-cta"
        >
          {t('education.vsPadlet.neonFree.cta')}
        </Link>
      </div>
    </section>
  );
}

export const PADLET_NEON_FREE_HELP_URL = HELP_URL;
export const PADLET_NEON_FREE_SUBS_URL = SUBS_URL;
