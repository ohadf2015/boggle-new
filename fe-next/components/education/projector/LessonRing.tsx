'use client';

import { memo } from 'react';
import { BookOpen } from 'lucide-react';

interface LessonRingProps {
  found: number;
  total: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

export const LessonRing = memo(function LessonRing({ found, total, t }: LessonRingProps) {
  const share = total > 0 ? Math.min(1, found / total) : 0;
  return (
    <div
      data-testid="live-lesson-ring"
      data-found={found}
      role="img"
      aria-label={t('eduLive.live.lessonFound', { found, total })}
      className="flex shrink-0 flex-col items-center gap-[clamp(2px,0.6cqh,8px)]"
    >
      <span className="relative grid size-16 shrink-0 place-items-center md:size-[clamp(56px,min(28cqw,15cqh),170px)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="12" className="stroke-neo-navy" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - share)}
            className="stroke-neo-cyan transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
          <circle cx="50" cy="50" r={R + 7} fill="none" strokeWidth="3" className="stroke-neo-cream" />
        </svg>
        <span dir="ltr" className="relative font-neo-display font-black leading-none tabular-nums text-neo-cream text-lg md:text-[clamp(16px,min(8cqw,4.6cqh),50px)]">
          {found}/{total}
        </span>
      </span>
      <span className="flex items-center gap-1 font-neo-display font-black uppercase leading-tight tracking-wide text-[clamp(13px,min(4cqw,2.4cqh),26px)] max-md:hidden">
        <BookOpen className="size-[1em] shrink-0 text-neo-cyan" aria-hidden />
        {t('education.wordcraftLive.lessonWords')}
      </span>
    </div>
  );
});

export default LessonRing;
