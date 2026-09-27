'use client';

/**
 * The student's lessons as painted cards: the same node art, stars and
 * destinations as the islands on the map (`academyNodes`), just all of them in
 * one list instead of the next five.
 */

import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StudentLesson } from '@/hooks/useStudentProgress';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import { lessonHref, lessonMastery, lessonStars, type NodeType } from '@/components/student/academy/academyNodes';
import { INK_TEXT, toneStyle, type Tone } from '@/components/student/academy/chrome';
import { cn } from '@/lib/utils';

const NODE_ART: Partial<Record<NodeType, string>> = {
  lesson: '/images/education/node-lesson.webp',
  quiz: '/images/education/node-quiz.webp',
  wordcraft: '/images/education/node-wordcraft.webp',
};

type T = (k: string, fallback?: string, params?: Record<string, unknown>) => string;

/** Done first would bury the work; open lessons lead, finished ones sink. */
export function orderLessons(lessons: StudentLesson[]): StudentLesson[] {
  const rank = (s: StudentLesson['status']) => (s === 'completed' ? 1 : 0);
  return [...lessons].sort((a, b) => rank(a.status) - rank(b.status));
}

function StatusChip({ entry, t }: { entry: StudentLesson; t: T }) {
  const tone: Tone = entry.status === 'completed' ? 'lime' : entry.status === 'started' && entry.progress ? 'teal' : 'pink';
  const label =
    entry.status === 'completed'
      ? t('academy.pages.lessonDone', 'Done')
      : entry.status === 'started' && entry.progress
        ? t('academy.pages.lessonKeepGoing', 'Keep going')
        : t('academy.pages.lessonNew', 'New');
  return (
    <span
      dir="auto"
      className="inline-flex h-7 items-center rounded-full border-2 border-neo-black px-2.5 font-neo-display text-xs font-black text-neo-black"
      style={toneStyle(tone, { shadow: 2, trim: 1 })}
    >
      {label}
    </span>
  );
}

function Stars({ count, t }: { count: number; t: T }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={t('academy.pages.starsAria', '{count} of 3 stars', { count })} role="img">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn('h-4 w-4 stroke-neo-black stroke-[2.5]', i < count ? 'fill-neo-yellow' : 'fill-white/15')}
        />
      ))}
    </span>
  );
}

export function LessonCard({ entry, level, locale }: { entry: StudentLesson; level: VocabularyLevel | null; locale: string }) {
  const { t } = useLanguage() as unknown as { t: T };
  const { type, href } = lessonHref(entry, locale);
  const mastery = lessonMastery(entry, level);
  const stars = lessonStars(entry.status, mastery);
  const words = entry.lesson?.words?.length ?? 0;
  const done = entry.status === 'completed';
  return (
    <Link
      href={href}
      data-testid="student-lesson-card"
      className="group flex min-h-[5rem] items-center gap-3 rounded-[16px] border-3 border-neo-black p-2.5 pe-3 outline-none transition-transform hover:-translate-y-0.5 active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow"
      style={toneStyle(done ? 'plum' : 'night', { shadow: 3, trim: 2 })}
    >
      <span className="relative h-14 w-14 shrink-0" aria-hidden="true">
        <Image src={NODE_ART[type] ?? NODE_ART.lesson!} alt="" fill unoptimized sizes="56px" className="object-contain drop-shadow-[2px_2px_0_#000]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span dir="auto" className={cn('truncate font-neo-display text-lg font-black leading-tight text-neo-white', INK_TEXT)}>
          {entry.lesson?.name ?? t('academy.pages.untitledLesson', 'Lesson')}
        </span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-neo-body text-xs font-bold text-neo-white/85">
          {words > 0 && <span dir="auto">{t('academy.pages.wordCount', '{count} words', { count: words })}</span>}
          {mastery > 0 && !done && <span dir="auto">{t('academy.pages.mastered', '{pct}% mastered', { pct: mastery })}</span>}
          {entry.dueDate && !done && (
            <span className="text-neo-yellow">
              {t('academy.pages.due', 'Due {date}', { date: new Date(entry.dueDate).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) })}
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusChip entry={entry} t={t} />
        <Stars count={stars} t={t} />
      </span>
    </Link>
  );
}

export function LessonsEmpty({ locale }: { locale: string }) {
  const { t } = useLanguage() as unknown as { t: T };
  // No "join a class" branch here on purpose: whether the student HAS a class is
  // another profile-gated read, and the map already owns that call to action.
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="relative h-24 w-24 sm:h-32 sm:w-32" aria-hidden="true">
        <Image src="/images/education/chest-books.webp" alt="" fill unoptimized sizes="128px" className="object-contain drop-shadow-[3px_3px_0_#000]" />
      </span>
      <p dir="auto" className={cn('font-neo-display text-xl font-black text-neo-white', INK_TEXT)}>
        {t('academy.pages.noLessonsTitle', 'No lessons yet')}
      </p>
      <p dir="auto" className="max-w-xs font-neo-body text-sm font-bold text-neo-white/85">
        {t('academy.pages.noLessonsBody', 'When your teacher shares a lesson, it lands here.')}
      </p>
      <Link
        href={`/${locale}/student`}
        data-testid="student-lessons-to-map"
        className="mt-1 inline-flex min-h-[44px] items-center rounded-[14px] border-3 border-neo-black px-5 font-neo-display text-base font-black text-neo-black outline-none active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow"
        style={toneStyle('lime', { shadow: 3 })}
      >
        {t('academy.pages.backToMap', 'Back to the Academy')}
      </Link>
    </div>
  );
}

/** Under a short list: where the next lessons come from, so a one-card list isn't a dead end. */
export function LessonsFootnote() {
  const { t } = useLanguage() as unknown as { t: T };
  return (
    <p dir="auto" className="mt-4 flex items-center justify-center gap-2 text-center font-neo-body text-sm font-bold text-neo-white/80">
      <span className="relative h-8 w-8 shrink-0" aria-hidden="true">
        <Image src="/images/education/node-locked.webp" alt="" fill unoptimized sizes="32px" className="object-contain" />
      </span>
      {t('academy.pages.moreLessons', 'New lessons from your teacher show up here.')}
    </p>
  );
}
