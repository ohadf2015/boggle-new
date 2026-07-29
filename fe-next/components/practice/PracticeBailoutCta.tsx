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
 * 2. **Quiet, not the hero.** Practice is meant to feel calm and fun; a giant
 *    saturated-pink button screaming "Skip to real game" was the loudest thing
 *    on every board, drawing the eye toward the exit. This renders as a slim
 *    ghost text-link so the escape stays available without competing with the
 *    game. (When the goal is done it brightens slightly + shows an arrow — a
 *    gentle forward nudge, while the celebration popup carries the loud CTA.)
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
        'font-neo-display font-bold text-sm underline underline-offset-4 ' +
        'decoration-2 transition-colors ' +
        (done
          ? 'text-neo-cream decoration-neo-cream/40 hover:decoration-neo-cream'
          : 'text-neo-white/60 decoration-neo-cream/20 hover:text-neo-white/90 hover:decoration-neo-cream/50') +
        (className ? ` ${className}` : '')
      }
    >
      <span>{t(`practice.${mode}.${key}`)}</span>
      {done && (
        <ArrowRight
          className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-0.5"
          strokeWidth={3}
          aria-hidden
        />
      )}
    </Link>
  );
}
