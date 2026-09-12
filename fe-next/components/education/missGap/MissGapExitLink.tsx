/**
 * The teacher's way out of the homework tool.
 *
 * The homework route hides the global bottom nav on BOTH entries. On the
 * student side that is the game rule (a game surface carries no app chrome);
 * on the teacher side it is a correctness fix — the nav that was showing is the
 * PLAYER nav (QUESTS / FRIENDS / HOME), three wrong-audience tabs on a teacher
 * tool, and all three render borderless on navy (`edgeRatio 0`), which is three
 * of the four controls the contrast audit flagged on that screen.
 *
 * Hiding a nav without replacing its one useful link would be a wayfinding
 * regression, so this is that link and nothing else: one control, cream on
 * navy, pointing at the teacher dashboard. `DirectionalIcon` flips the arrow in
 * Hebrew — a hard-coded `ArrowLeft` would point out of the page in RTL.
 *
 * The width is written `border-[3px]` rather than `border-neo`: cn()'s
 * tailwind-merge config puts the width utilities in the same group as
 * `border-neo-<colour>`, so `cn('border-neo','border-neo-black')` resolves to
 * the colour alone and Tailwind preflight renders the control borderless.
 */
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';

export interface MissGapExitLinkProps {
  /** Route-segment locale — the dashboard lives under the same prefix. */
  locale: string;
}

export function MissGapExitLink({ locale }: MissGapExitLinkProps) {
  const { t } = useLanguage();

  return (
    <Link
      href={`/${locale}/teacher`}
      data-testid="miss-gap-exit-link"
      className={[
        'inline-flex items-center gap-2 self-start shrink-0',
        'px-3 py-2 rounded-neo font-neo-display font-bold text-sm',
        'bg-neo-cream text-neo-black border-[3px] border-neo-black shadow-hard-sm',
        'transition-transform active:translate-x-[2px] active:translate-y-[2px]',
      ].join(' ')}
    >
      <DirectionalIcon icon={ArrowLeft} className="w-4 h-4" />
      {t('education.homework.backToDashboard')}
    </Link>
  );
}
