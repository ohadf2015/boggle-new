'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import { cn } from '@/lib/utils';
import { Copy, Loader, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Language } from '@/lib/supabase/education/types';

interface PlayTabFirstRunCardProps {
  onJoinCodeCreated?: (code: string) => void;
  initialJoinCode?: string | null;
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
 * Motion: none. The card's resting state paints in full on the first frame —
 * an opacity tween on a card this size is the mobile-web flash of pitfall
 * class 5, and it used to have one.
 */
export default function PlayTabFirstRunCard({ onJoinCodeCreated, initialJoinCode }: PlayTabFirstRunCardProps) {
  const { t, language } = useLanguage();
  const { createClassroom } = useClassrooms();

  const [isLoading, setIsLoading] = useState(false);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(initialJoinCode ?? null);

  const handleCreate = async () => {
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
    <section
      data-testid="play-tab-first-run-card"
      className="flex items-center gap-4 rounded-neo border-3 border-black bg-neo-navy-light px-4 py-4 shadow-hard sm:gap-5 sm:px-5"
    >
      {/* Lexi minding an empty room. Decorative — the copy carries the meaning. */}
      <Image
        src="/mascot/teacher/hero-empty-classroom.webp"
        data-testid="teacher-empty-classroom-art"
        alt=""
        aria-hidden="true"
        width={160}
        height={160}
        className="hidden size-24 shrink-0 select-none object-contain sm:block sm:size-28"
      />

      <div className="min-w-0 flex-1">
        {createdJoinCode ? (
          <>
            <p className="font-neo-display text-base font-black text-neo-white sm:text-lg">
              {t('teacher.classroom.createdBannerTitle')}
            </p>
            <p className="mt-0.5 font-neo-body text-xs font-bold text-neo-white/70 text-pretty">
              {t('teacher.classroom.createdBannerBody')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code
                data-testid="first-run-join-code"
                className="rounded-neo border-3 border-black bg-neo-lime px-4 py-2 font-mono text-lg font-black tracking-widest text-black shadow-hard-sm"
              >
                {createdJoinCode}
              </code>
              <button
                type="button"
                onClick={copyJoinCode}
                aria-label={t('teacher.classroom.copyCode')}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black bg-black px-3 py-2',
                  'font-neo-body text-sm font-bold text-neo-lime shadow-hard-sm transition-all',
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
            <p className="font-neo-display text-base font-black text-neo-white sm:text-lg text-balance">
              {t('teacher.emptyClassroom.title')}
            </p>
            <p className="mt-0.5 font-neo-body text-xs font-bold text-neo-white/70 text-pretty">
              {t('teacher.emptyClassroom.body')}
            </p>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isLoading}
              data-testid="first-run-create-class"
              className={cn(
                // Was `bg-neo-navy` + `border-black/40` on this card's own
                // navy-light fill: ~1.2:1 both ways, i.e. a button you find by
                // guessing where it is. A solid cyan chip is ~9:1 against the
                // card and carries its own edge.
                // Widths are literal: cn()'s tailwind-merge files `border-neo`
                // in the same group as `border-neo-<colour>`, so the width is
                // silently dropped and preflight renders no border at all.
                'mt-3 inline-flex min-h-11 items-center gap-2 rounded-neo border-[2px] border-black px-4 py-2',
                'bg-neo-cyan font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm',
                'transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
                isLoading && 'cursor-not-allowed opacity-60',
              )}
            >
              {isLoading ? (
                <Loader className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Users className="size-4" aria-hidden="true" />
              )}
              {t('teacher.emptyClassroom.getCode')}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
