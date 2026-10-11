'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import s from './lesson.module.css';

export interface LessonCompleteProps {
  words: number;
  points: number;
  bestStreak: number;
  onClose: () => void;
  /** Secondary action, e.g. challenge a friend. */
  friendHref?: string;
}

const CONFETTI = Array.from({ length: 28 }, (_, i) => i);
const COLORS = ['#bfff00', '#00ffff', '#ff1493', '#ffd60a', '#8b5cf6'];

/** Lesson finale: the mascot cheers, the stats stamp in, and the round carries on. */
export function LessonComplete({ words, points, bestStreak, onClose, friendHref }: LessonCompleteProps) {
  const { t, dir } = useLanguage();
  const stats = [
    { key: 'words', label: t('firstLesson.statWords'), value: words, tone: 'bg-neo-cyan' },
    { key: 'points', label: t('firstLesson.statPoints'), value: points, tone: 'bg-neo-lime' },
    { key: 'streak', label: t('firstLesson.statStreak'), value: bestStreak, tone: 'bg-neo-yellow' },
  ];

  return (
    <div
      data-testid="lesson-complete"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-complete-title"
      dir={dir}
      onClick={onClose}
      className="fixed inset-0 z-[155] flex items-center justify-center bg-neo-navy/85 px-4"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0">
        {CONFETTI.map((i) => (
          <span
            key={i}
            className={cn(s.confetti, 'absolute top-0 block h-3.5 w-2 rounded-[2px] border border-neo-black')}
            style={{
              left: `${3 + ((i * 41) % 94)}%`,
              background: COLORS[i % COLORS.length],
              ['--x' as string]: `${((i % 7) - 3) * 18}px`,
              ['--y' as string]: `${260 + ((i * 53) % 320)}px`,
              ['--r' as string]: `${(i % 2 ? 1 : -1) * (300 + i * 20)}deg`,
              ['--delay' as string]: `${(i % 6) * 70}ms`,
              ['--dur' as string]: `${1500 + (i % 4) * 220}ms`,
            }}
          />
        ))}
      </div>

      <div
        className={cn(s.cardIn, 'relative w-full max-w-sm rounded-2xl border-[4px] border-neo-black bg-neo-navy-light px-5 pb-5 pt-16 text-center shadow-[6px_6px_0_#000]')}
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2">
          <div className={cn(s.sunburst, 'absolute inset-0 rounded-full')} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/bridge-cheer-nobg.webp"
            alt=""
            width={150}
            height={150}
            className={cn(s.mascotBounce, 'absolute inset-0 m-auto h-[150px] w-[150px] object-contain drop-shadow-[4px_4px_0_#000]')}
          />
        </div>

        <h2 id="lesson-complete-title" className="font-neo-display text-[30px] font-black leading-none text-neo-lime [text-shadow:3px_3px_0_#000]">
          {t('firstLesson.complete')}
        </h2>
        <p className="mt-2 font-neo-body text-sm font-bold text-neo-cream/85">{t('firstLesson.completeSub')}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((st, i) => (
            <div
              key={st.key}
              className={cn(s.statIn, 'rounded-xl border-[3px] border-neo-black shadow-[3px_3px_0_#000]', st.tone)}
              style={{ ['--delay' as string]: `${120 + i * 80}ms` }}
            >
              <p className="border-b-[3px] border-neo-black px-1 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-wider text-neo-black">
                {st.label}
              </p>
              <p dir="ltr" className="rounded-b-[9px] bg-neo-navy py-1.5 font-neo-display text-2xl font-black tabular-nums text-neo-cream">
                {st.value}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-5 w-full rounded-xl border-[3px] border-neo-black bg-neo-lime py-3 font-neo-display text-lg font-black uppercase tracking-wide text-neo-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"
        >
          {t('firstLesson.keepPlaying')}
        </button>
        {friendHref && (
          <Link
            href={friendHref}
            className="mt-3 inline-block font-neo-body text-sm font-bold text-neo-cyan underline underline-offset-2"
          >
            {t('homeFresh.hero.playFriend')}
          </Link>
        )}
      </div>
    </div>
  );
}

export default LessonComplete;
