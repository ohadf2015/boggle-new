'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import { trackTeacherOnboardingStep } from '@/lib/education/telemetry';
import { cn } from '@/lib/utils';
import { Copy, Loader, Plus } from 'lucide-react';
import { JoinCardFrame } from './hq/JoinCardFrame';
import toast from 'react-hot-toast';
import type { Language } from '@/lib/supabase/education/types';

interface PlayTabFirstRunCardProps {
  onJoinCodeCreated?: (code: string) => void;
  initialJoinCode?: string | null;
  className?: string;
}

/**
 * The zero-classroom state — a picture and one line, not a second form.
 *
 * This card used to ask for a classroom NAME and then create one, while the
 * PLAY NOW panel three inches above it provisioned a classroom silently on GO
 * LIVE. Two ways to the same outcome on one screen, one of them a text input
 * (recurring pitfall class 3: asymmetric paths to a single state). The form is
 * gone. GO LIVE is the path.
 *
 * What stays is the part only this card ever showed: the join code, the one
 * thing a teacher must be able to copy into Google Classroom before a single
 * student can arrive. So a teacher who wants the code BEFORE the bell still
 * gets it in one tap — no field to fill, the default name applied silently and
 * editable later in the classroom manager.
 *
 * Round 3: it wears the "Get students in" frame (step 2) so the slot keeps its
 * shape across loading → no class → live card; the six empty code slots show
 * what the one tap will produce.
 *
 * Motion: none. The card's resting state paints in full on the first frame —
 * an opacity tween on a card this size is the mobile-web flash of pitfall
 * class 5, and it used to have one.
 */
export default function PlayTabFirstRunCard({ onJoinCodeCreated, initialJoinCode, className }: PlayTabFirstRunCardProps) {
  const { t, language } = useLanguage();
  const { createClassroom } = useClassrooms();

  const [isLoading, setIsLoading] = useState(false);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(initialJoinCode ?? null);

  const handleCreate = async () => {
    // The #1099 checklist hides its own create CTA while this card is on
    // screen, so this click reports the funnel step it would have (on click,
    // like the checklist's runCta — not on success).
    trackTeacherOnboardingStep({ step: 'create_classroom', action: 'cta' });
    setIsLoading(true);
    // The default name, applied without asking. A teacher renames a class once,
    // later, in the manager — never at the moment they are trying to start one.
    const result = await createClassroom(t('teacher.classroom.defaultName'), language as Language);
    setIsLoading(false);

    if (result.success) {
      // `result.data.join_code`, NOT `result.code`. On success the hook returns
      // `{ success: true, data: classroom }`; `code` is set ONLY on the 403 failure branch,
      // where it carries 'CLASS_LIMIT_REACHED'.
      const joinCode = result.data?.join_code;
      if (joinCode) {
        setCreatedJoinCode(joinCode);
        onJoinCodeCreated?.(joinCode);
        toast.success(t('teacher.classroom.success.created'));
      } else {
        // Created, but with no code to hand out. Say so rather than rendering nothing —
        // a silent no-op here is indistinguishable from the button not working.
        toast.error(t('teacher.classroom.error.createFailed'));
      }
    } else {
      toast.error(result.error || t('teacher.classroom.error.createFailed'));
    }
  };

  const copyJoinCode = () => {
    if (!createdJoinCode) return;
    // Copy the LINK, not the bare six characters — same reasoning as ClassroomManager's
    // copy button. A teacher pastes this into Google Classroom or WhatsApp, and "ABC123"
    // alone is a dead end for the student who receives it.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard
      .writeText(classroomInvitePayload(origin, language, createdJoinCode))
      .catch(() => {});
    toast.success(t('teacher.classroom.codeCopied'));
  };

  return (
    <JoinCardFrame testId="play-tab-first-run-card" className={className}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-3 lg:p-4">
        {createdJoinCode ? (
          <>
            {/* The code, same plate as the live card: read from the back row. */}
            <div className="flex shrink-0 flex-col items-center justify-center rounded-neo border-3 border-neo-yellow bg-neo-navy px-2 py-1 shadow-hard-sm lg:py-2">
              <span className="font-neo-display text-[0.65rem] font-black uppercase tracking-widest text-neo-yellow/75 lg:text-sm">
                {t('teacher.classroom.createdBannerTitle')}
              </span>
              <code
                data-testid="first-run-join-code"
                dir="ltr"
                className="select-all whitespace-nowrap font-mono text-5xl font-black leading-none tracking-[0.1em] text-neo-yellow sm:text-6xl lg:text-7xl"
              >
                {createdJoinCode}
              </code>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-neo border-2 border-neo-cream/60 bg-neo-navy/70 px-2 py-1.5 lg:min-h-0 lg:flex-1 lg:flex-col lg:justify-center lg:p-4">
              <p className="min-w-0 flex-1 font-neo-body text-xs font-bold text-neo-white/80 text-pretty lg:flex-none lg:text-center lg:text-sm">
                {t('teacher.classroom.createdBannerBody')}
              </p>
              <button
                type="button"
                onClick={copyJoinCode}
                aria-label={t('teacher.classroom.copyCode')}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-neo border-[2px] border-black bg-neo-lime px-3 py-2',
                  'font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm transition-all',
                  'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
                  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
                )}
              >
                <Copy className="size-4" aria-hidden="true" />
                {t('teacher.classroom.copyCode')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Where the code will be: six empty slots, so the promise is visible. */}
            <div
              aria-hidden="true"
              className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-neo border-3 border-dashed border-neo-yellow/60 bg-neo-navy px-2 py-1.5 lg:gap-2 lg:py-3"
            >
              <span className="font-neo-display text-[0.65rem] font-black uppercase tracking-widest text-neo-yellow/75 lg:text-sm">
                {t('academy.hq.classCode', 'Class code')}
              </span>
              <span dir="ltr" className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <span
                    key={i}
                    className="flex h-10 w-8 items-center justify-center rounded-md border-2 border-dashed border-neo-yellow/45 font-mono text-2xl font-black text-neo-yellow/40 sm:h-12 sm:w-10 lg:h-16 lg:w-14 lg:text-4xl"
                  >
                    ?
                  </span>
                ))}
              </span>
            </div>

            <div className="flex min-h-0 shrink-0 items-center gap-3 rounded-neo border-2 border-neo-cream/60 bg-neo-navy/70 px-2 py-2 lg:flex-1 lg:flex-col lg:justify-center lg:gap-4 lg:p-4">
              {/* Lexi minding an empty room. Decorative — the copy carries the meaning. */}
              <Image
                src="/mascot/teacher/hero-empty-classroom.webp"
                data-testid="teacher-empty-classroom-art"
                alt=""
                aria-hidden="true"
                width={160}
                height={160}
                className="size-14 shrink-0 select-none object-contain sm:size-16 lg:size-32"
              />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 lg:flex-none lg:items-center lg:text-center">
                <p className="font-neo-display text-sm font-black uppercase leading-tight tracking-tight text-neo-white text-balance sm:text-base lg:text-2xl">
                  {t('academy.hq.noClassTitle', 'Create your class, get a code in 5 seconds')}
                </p>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isLoading}
                  data-testid="first-run-create-class"
                  className={cn(
                    // A solid cyan chip (~9:1 on the navy card) with its own
                    // black edge. Widths are literal: cn()'s tailwind-merge files
                    // `border-neo` in the same group as `border-neo-<colour>`, so
                    // the width would be silently dropped.
                    'inline-flex min-h-11 items-center gap-2 rounded-neo border-[3px] border-black px-4 py-2',
                    'bg-neo-cyan font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm lg:text-base',
                    'transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
                    isLoading && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {isLoading ? (
                    <Loader className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
                  )}
                  {t('academy.hq.createClassCta', 'Create my class')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </JoinCardFrame>
  );
}
