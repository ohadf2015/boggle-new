/**
 * Education honesty strip (marketing foil, not a product feature):
 * Pear Deck Teacher Free = unlimited Sessions/participants + anonymous projector;
 * named student responses on Free only via export-to-spreadsheet (Google) or
 * Flashcard Factory hover. Teacher Premium = live named Teacher Dashboard
 * (view/highlight by name, hide/block), Drawing/Draggable, Reflect & Review,
 * Teacher Feedback.
 * (verified live on peardeck.com/pricing + help.peardeck.com/migration/en/handling-inappropriate-responses
 * — lastChecked 2026-09-30).
 *
 * Distinct from ClassPoint Basic Free 25/5Q (#1202), Socrative Free 5/1/50 (#1196),
 * Mentimeter Free 50/month (#1183), Wooclap Starter 5 active (#1186). Do NOT reopen
 * those strips / change ClassPoint/Socrative. Do NOT touch open #1204 audio PR.
 * CTA rule: LexiClash 50-seat / roster-named limits in CTAs only; competitor caps only in strip/body.
 * Prod domain is lexiclash.live (never lexiclash.com).
 * Mentimeter-safe boot (hotfix#1195 lesson): revalidate 86400, light client strip, light server page
 * — mirror ClassPoint#1202 / Socrative#1196. ONE page only.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const PRICING_URL = 'https://www.peardeck.com/pricing';
const HELP_URL = 'https://help.peardeck.com/migration/en/handling-inappropriate-responses';

export interface PearDeckTeacherFreeHonestyStripProps {
  locale?: string;
  className?: string;
}

export function PearDeckTeacherFreeHonestyStrip({
  locale,
  className,
}: PearDeckTeacherFreeHonestyStripProps) {
  const { t, language } = useLanguage();
  const loc = locale || language || 'en';

  return (
    <section
      data-testid="peardeck-teacher-free-honesty-strip"
      aria-labelledby="peardeck-teacher-free-honesty-heading"
      className={cn(
        'mb-12 rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/60 p-5 shadow-hard sm:p-6',
        className,
      )}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">
        {t('education.vsPearDeck.teacherFree.eyebrow')}
      </p>
      <h2
        id="peardeck-teacher-free-honesty-heading"
        className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl"
      >
        {t('education.vsPearDeck.teacherFree.title')}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        {t('education.vsPearDeck.teacherFree.lede')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article
          data-testid="peardeck-teacher-free-named-response-card"
          className="rounded-neo border-3 border-neo-gray-400/50 bg-neo-navy/40 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-gray-300">
            {t('education.vsPearDeck.teacherFree.pdTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsPearDeck.teacherFree.pdBody')}
          </p>
        </article>
        <article
          data-testid="lexiclash-peardeck-teacher-free-roster-card"
          className="rounded-neo border-3 border-neo-lime/50 bg-neo-lime/10 p-4"
        >
          <h3 className="mb-2 font-bold text-neo-lime">
            {t('education.vsPearDeck.teacherFree.lexiTitle')}
          </h3>
          <p className="text-sm text-neo-gray-200">
            {t('education.vsPearDeck.teacherFree.lexiBody')}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-neo-gray-300">
        {t('education.vsPearDeck.teacherFree.citePrefix')}{' '}
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="peardeck-teacher-free-pricing-link"
        >
          {t('education.vsPearDeck.teacherFree.citePlansLabel')}
        </a>
        {' · '}
        <a
          href={HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-neo-cyan/60 underline-offset-2 hover:text-neo-cyan"
          data-testid="peardeck-teacher-free-help-link"
        >
          {t('education.vsPearDeck.teacherFree.citeHelpLabel')}
        </a>
        {t('education.vsPearDeck.teacherFree.citeSuffix')}
      </p>

      <div className="mt-5">
        <Link
          href={`/${loc}/education/classroom-game`}
          className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
          data-testid="peardeck-teacher-free-cta"
        >
          {t('education.vsPearDeck.teacherFree.cta')}
        </Link>
      </div>
    </section>
  );
}

export const PEARDECK_TEACHER_FREE_PRICING_URL = PRICING_URL;
export const PEARDECK_TEACHER_FREE_HELP_URL = HELP_URL;
