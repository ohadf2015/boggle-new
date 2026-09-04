'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import { cn } from '@/lib/utils';
import { m } from 'framer-motion';
import { Copy, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Language } from '@/lib/supabase/education/types';
import Image from 'next/image';

interface PlayTabFirstRunCardProps {
  onJoinCodeCreated?: (code: string) => void;
  initialJoinCode?: string | null;
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/**
 * PlayTabFirstRunCard
 *
 * Shown on the play tab when a teacher has zero classrooms (loaded state).
 * Teachers can instantly create a classroom with a pre-filled sensible default name.
 * After creation, displays the join code ready to share with students.
 *
 * Reduces friction to ONE required field: just the classroom name.
 * Language defaults to teacher's current interface language.
 * Teachers can edit language later if needed.
 */
export default function PlayTabFirstRunCard({ onJoinCodeCreated, initialJoinCode }: PlayTabFirstRunCardProps) {
  const { t, language } = useLanguage();
  const { createClassroom } = useClassrooms();
  const isRTL = language === 'he';

  const [classroomName, setClassroomName] = useState(t('teacher.classroom.defaultName'));
  const [isLoading, setIsLoading] = useState(false);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(initialJoinCode ?? null);

  const handleCreate = async () => {
    if (!classroomName.trim()) {
      toast.error(t('teacher.classroom.validation.nameRequired'));
      return;
    }

    setIsLoading(true);
    // Pass teacher's current language as default; they can edit it later
    const result = await createClassroom(classroomName.trim(), language as Language);
    setIsLoading(false);

    if (result.success) {
      // `result.data.join_code`, NOT `result.code`. On success the hook returns
      // `{ success: true, data: classroom }`; `code` is set ONLY on the 403 failure branch,
      // where it carries 'CLASS_LIMIT_REACHED'. Reading `code` here meant `joinCode` was
      // always undefined, the `if` never ran, and a teacher creating their first classroom
      // was shown neither the success toast nor the join code — the one thing this card
      // exists to produce.
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

  // After creation: show join code
  if (createdJoinCode) {
    return (
      <m.div
        data-testid="play-tab-first-run-card"
        variants={fadeSlide}
        initial="initial"
        animate="animate"
        exit="exit"
        className="rounded-neo border-3 border-black bg-neo-cream shadow-hard px-6 py-8 text-center"
      >
        <div className="mb-6">
          <p className="text-black font-neo-body font-black text-lg mb-4">
            {t('teacher.classroom.createdBannerTitle')}
          </p>
          <p className="text-sm font-neo-body text-black/70 mb-6">
            {t('teacher.classroom.createdBannerBody')}
          </p>
          {/* Decorative only. */}
          <Image
            src="/images/education/share-code.webp"
            alt=""
            aria-hidden="true"
            width={320}
            height={180}
            className="mx-auto mb-5 w-full max-w-[260px] h-auto select-none"
          />

          {/* Join Code Display */}
          <div className="inline-block mb-4">
            <div className="flex items-center gap-3 px-5 py-4 rounded-neo border-3 border-black bg-neo-lime shadow-hard">
              <code className="font-mono font-black text-lg text-black tracking-widest">
                {createdJoinCode}
              </code>
              <button
                type="button"
                onClick={copyJoinCode}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-neo',
                  'border-2 border-black bg-black text-neo-lime font-neo-body font-bold text-sm',
                  'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 transition-all shadow-hard-sm',
                  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
                )}
                aria-label={t('teacher.classroom.copyCode')}
              >
                <Copy className="w-4 h-4" />
                {t('teacher.classroom.copyCode')}
              </button>
            </div>
          </div>

          <p className="text-xs text-black/60 font-neo-body mt-4">
            {t('teacher.classroom.dialog.createDescription')}
          </p>
        </div>
      </m.div>
    );
  }

  // Before creation: show form
  return (
    <m.div
      data-testid="play-tab-first-run-card"
      variants={fadeSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      className="rounded-neo border-3 border-black bg-neo-cream shadow-hard px-6 py-8 text-center"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="mb-8">
        <h3 className="text-xl font-neo-display font-black text-black mb-2">
          {t('teacher.classroom.create')}
        </h3>
        <p className="text-sm font-neo-body text-black/70">
          {t('teacher.classroom.dialog.createDescription')}
        </p>
      </div>

      {/* Classroom Name Input — only required field */}
      <div className="mb-6 text-start">
        <label htmlFor="classroom-name" className="block text-sm font-neo-body font-black text-black mb-2">
          {t('teacher.classroom.name')}
        </label>
        <input
          id="classroom-name"
          type="text"
          value={classroomName}
          onChange={(e) => setClassroomName(e.target.value)}
          placeholder={t('teacher.classroom.namePlaceholder')}
          disabled={isLoading}
          required
          className={cn(
            'w-full px-4 py-2.5 border-2 border-black rounded-neo shadow-hard-sm',
            'font-neo-body font-bold text-black bg-neo-white',
            'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
            isLoading && 'opacity-60 cursor-not-allowed'
          )}
        />
      </div>

      {/* Create Button */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={isLoading || !classroomName.trim()}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px]',
          'rounded-neo border-3 border-black bg-neo-cyan font-neo-display font-black text-black',
          'shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5',
          'active:shadow-hard-pressed transition-all',
          'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
          (isLoading || !classroomName.trim()) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          t('teacher.classroom.create')
        )}
      </button>
    </m.div>
  );
}
