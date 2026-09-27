/**
 * Turn-in + parent share — the two things that exist only AFTER a run.
 *
 * Rendered at the moment of triumph inside the game's finish screen, and on the
 * page once the overlay is closed. The parent builds this ONCE and hands the
 * same node to both places (guarded by `!playing`), so the two surfaces can
 * never both mount and collide on these test ids.
 *
 * `border-[3px]` is written next to the colour class on purpose: tailwind-merge
 * puts `border-neo` (a width) in the same group as `border-neo-<colour>`, so a
 * `cn()` that combines them DROPS the width and preflight renders the control
 * borderless. Do not tidy these strings — Tailwind v4 also only generates an
 * arbitrary value from a literal class string.
 */
'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons/SocialIcons';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';
import type { MissGapGradeScore } from '@/lib/education/missGapGradePassback';
import {
  buildMissGapWhatsAppDeepLink,
  canShareMissGapWhatsApp,
} from '@/lib/education/missGapWhatsAppShare';

export interface MissGapTurnInActionsProps {
  completed: boolean;
  payload: MissGapAssignmentPayload;
  lesson: string;
  gradeScore: MissGapGradeScore | null;
  gradePassbackHref: string | null;
}

export function MissGapTurnInActions({
  completed,
  payload,
  lesson,
  gradeScore,
  gradePassbackHref,
}: MissGapTurnInActionsProps) {
  const { t } = useLanguage();
  const words = payload.missedWords;

  return (
    <>
      {completed && gradeScore && gradePassbackHref ? (
        <div className="space-y-2" data-testid="miss-gap-async-grade-passback">
          <p className="text-neo-cream font-bold text-sm">
            {t('education.results.missGapGradePassbackScore', {
              points: gradeScore.pointsEarned,
              max: gradeScore.maxPoints,
            })}
          </p>
          <Link
            href={gradePassbackHref}
            data-testid="miss-gap-async-open-grade-passback"
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-4',
              'font-neo-display font-bold text-lg',
              'bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg transition-all',
            )}
          >
            <GraduationCap className="w-5 h-5" aria-hidden />
            {t('education.results.missGapGradePassbackOpen')}
          </Link>
        </div>
      ) : null}
      {completed && canShareMissGapWhatsApp(payload) ? (
        <a
          href={buildMissGapWhatsAppDeepLink({
            text: t('education.results.missGapWhatsAppShareText', {
              lesson,
              missed: words.join(', '),
              due: payload.dueDate || '—',
            }),
            input: payload,
          })}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="miss-gap-async-whatsapp-share"
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold',
            // Secondary, deliberately: turning the work in is the action, and
            // two full-width green slabs made the finish screen ask the student
            // to choose between them. Cream text + a 2px cream border clears
            // the 3:1 edge rule on navy without competing with the lime CTA
            // above it; the glyph keeps the WhatsApp green so the control is
            // still recognisable at a glance.
            'bg-neo-navy text-neo-cream border-[2px] border-neo-cream rounded-neo',
            'transition-colors hover:bg-neo-navy-light',
          )}
        >
          <WhatsAppIcon className="w-5 h-5 text-brand-whatsapp" />
          {t('education.results.missGapWhatsAppShare')}
        </a>
      ) : null}
    </>
  );
}
