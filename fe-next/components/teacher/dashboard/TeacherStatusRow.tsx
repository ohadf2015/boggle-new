'use client';

import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherPlanBadge } from '../TeacherPlanBadge';
import { cn } from '@/lib/utils';

/**
 * ONE slim line between the header and the hero — and never a second.
 *
 * The space above PLAY NOW used to be a stack: a two-line title block, then a
 * plan badge on its own row, with a Pro-welcome dialog and an onboarding modal
 * both able to mount over the top of it. On a 390px phone that pushed the one
 * button this screen exists for below the fold before the teacher had touched
 * anything.
 *
 * Everything that survived is on this line: who is logged in, which plan they
 * are on, and Lexi — because a screen with a mascot on it is the difference
 * between a tool and a game (the bar here is Blooket, whose dashboard is a
 * left rail and a grid of grey cards).
 *
 * Deliberately fixed-height and non-scrolling: it is chrome, not content.
 */
export function TeacherStatusRow({ className }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <div
      data-testid="teacher-status-row"
      className={cn(
        'flex items-center gap-3 border-b-3 border-black/40 bg-neo-navy px-4 py-2 sm:px-6',
        className,
      )}
    >
      {/* Lexi, ready to teach. Decorative: the greeting carries the meaning.
          The cyan chip is not decoration for its own sake — the art is a
          pale sticker, and at 40px on navy it reads as a smudge without
          something solid behind it. */}
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-neo border-2 border-black bg-neo-cyan shadow-hard-sm sm:size-12">
        <Image
          src="/mascot/teacher/teacher-hero.webp"
          data-testid="teacher-greeting-mascot"
          alt=""
          aria-hidden="true"
          width={96}
          height={96}
          priority
          className="size-full select-none object-contain"
        />
      </span>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-neo-display text-base font-black uppercase tracking-tight text-neo-white sm:text-xl">
          {t('teacher.dashboard.title')}
        </h1>
        <p className="hidden truncate font-neo-body text-xs font-bold text-neo-white/60 sm:block">
          {t('teacher.dashboard.subtitle')}
        </p>
      </div>

      <TeacherPlanBadge className="shrink-0" />
    </div>
  );
}

export default TeacherStatusRow;
