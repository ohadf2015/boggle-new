'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  /** Which practice mode this sandbox is — selects the copy + (via caller) the href. */
  mode: PracticeMode;
  /** Goal reached? `true` → "Play <mode> now"; `false` → quiet "skip to real game". */
  done: boolean;
  /** Real-game destination (caller passes practiceTargetUrl(mode, locale)). */
  href: string;
  className?: string;
}

/**
 * The one-tap escape from a practice sandbox to the real game.
 *
 * Two jobs, both fixes from the 2026-05-29 practice UX pass:
 *
 * 1. **Mode-correct copy.** Each sandbox used to inline `practice.wordHunt.*`
 *    keys regardless of mode, so finishing Classic said "Play Word Hunt now".
 *    This resolves `practice.<mode>.{playRealCta,bailoutCta}` so the wording
 *    always matches the mode you actually played.
 *
 * 2. **A real, tappable button — not the hero.** Practice should feel calm, so
 *    this isn't a giant saturated-pink CTA. But the original slim ghost text-link
 *    was so quiet players missed it entirely (founder: "let's have a skip button
 *    if the player wants to start playing immediately"). It now renders as a
 *    clear bordered button — a visible affordance with a forward arrow — that
 *    reads as "go play the real game" without shouting over the board. (When the
 *    goal is done it brightens to a solid cream fill; the celebration popup still
 *    carries the loud primary CTA.)
 */
export default function PracticeBailoutCta({ mode, done, href, className = '' }: Props) {
  const { t } = useLanguage();
  const key = done ? 'playRealCta' : 'bailoutCta';

  return (
    <Link
      href={href}
      data-testid="practice-bailout-cta"
      className={
        'group inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 ' +
        'rounded-neo border-2 font-neo-display font-bold text-sm transition-colors ' +
        'active:translate-y-px ' +
        (done
          ? 'bg-neo-cream text-neo-black border-neo-black shadow-hard-sm hover:brightness-105'
          : 'bg-neo-navy-light/70 text-neo-cream border-neo-cream/50 ' +
            'hover:bg-neo-navy-light hover:border-neo-cream') +
        (className ? ` ${className}` : '')
      }
    >
      <span>{t(`practice.${mode}.${key}`)}</span>
      <ArrowRight
        className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-0.5"
        strokeWidth={3}
        aria-hidden
      />
    </Link>
  );
}
