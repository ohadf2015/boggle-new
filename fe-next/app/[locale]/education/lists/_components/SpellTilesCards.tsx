'use client';

import { Play, RotateCcw, Star, Trophy } from 'lucide-react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { SpellLabels } from './SpellTilesPractice';

export function fill(template: string, vars: Record<string, string | number>, locale: string): string {
  const nf = new Intl.NumberFormat(locale);
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? (typeof vars[k] === 'number' ? nf.format(vars[k] as number) : String(vars[k])) : m));
}

export interface TeacherCta {
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function WelcomeCard({ title, count, labels, locale, onStart }: { title: string; count: number; labels: SpellLabels; locale: string; onStart: () => void }) {
  return (
    <div className="m-auto w-full max-w-md rounded-neo-lg border-4 border-neo-black bg-neo-cream p-6 text-center text-neo-navy shadow-hard-lg sm:p-8">
      <h2 className="font-neo-display text-3xl font-black">{labels.welcomeTitle}</h2>
      <p className="mt-2 font-neo-display text-lg font-black" dir="auto">
        {title}
      </p>
      <span className="mt-3 inline-block rounded-full border-3 border-neo-black bg-neo-orange px-4 py-1 font-neo-display text-sm font-black uppercase tracking-wider text-neo-navy">
        {fill(labels.wordCount, { count }, locale)}
      </span>
      <p className="mx-auto mt-4 max-w-xs text-base font-bold text-neo-navy/80">{labels.welcomeBody}</p>
      <button
        type="button"
        onClick={onStart}
        aria-label={labels.start}
        className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-neo-black bg-neo-lime text-neo-navy shadow-hard-lg transition-transform duration-150 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan motion-reduce:transition-none"
      >
        <Play className="h-9 w-9 rtl:-scale-x-100" fill="currentColor" aria-hidden />
      </button>
      <span className="mt-2 block font-neo-display text-sm font-black uppercase tracking-widest">{labels.start}</span>
    </div>
  );
}

interface EndProps {
  labels: SpellLabels;
  locale: string;
  firstTry: number;
  total: number;
  stars: number;
  teacherCta: TeacherCta;
  onAgain: () => void;
  onClose: () => void;
}

export function EndCard({ labels, locale, firstTry, total, stars, teacherCta, onAgain, onClose }: EndProps) {
  const pct = total ? Math.round((firstTry / total) * 100) : 0;
  const cheer = pct >= 90 ? labels.cheerTop : pct >= 60 ? labels.cheerMid : labels.cheerLow;
  return (
    <div className="m-auto grid w-full max-w-3xl gap-4 md:grid-cols-[3fr_2fr] md:items-stretch">
      <section className="rounded-neo-lg border-4 border-neo-black bg-neo-cream p-6 text-center text-neo-navy shadow-hard-lg">
        <Trophy className="mx-auto h-12 w-12 text-neo-orange" strokeWidth={2.5} aria-hidden />
        <h2 className="mt-2 font-neo-display text-3xl font-black">{labels.endTitle}</h2>
        <p className="mt-1 font-neo-display text-6xl font-black leading-none" data-accuracy>
          {new Intl.NumberFormat(locale, { style: 'percent' }).format(pct / 100)}
        </p>
        <p className="mt-2 text-base font-bold">{fill(labels.endAccuracy, { correct: firstTry, total }, locale)}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-neo-navy/80">
          <Star className="h-4 w-4 text-neo-orange" fill="currentColor" aria-hidden />
          {fill(labels.endStars, { stars }, locale)}
        </p>
        <p className="mt-3 font-neo-display text-lg font-black">{cheer}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onAgain}
            className="inline-flex items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime px-5 py-3 font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {labels.again}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-neo border-3 border-neo-black bg-neo-white px-5 py-3 font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            {labels.close}
          </button>
        </div>
      </section>
      <aside className="flex flex-col justify-center rounded-neo-lg border-4 border-neo-black bg-neo-pink p-5 text-neo-navy shadow-hard-lg">
        <h3 className="font-neo-display text-xl font-black">{labels.teacherTitle}</h3>
        <p className="mt-1 text-sm font-bold">{labels.teacherBody}</p>
        <a
          href={teacherCta.href}
          onClick={(e) => {
            trackGrowthEvent('landing_cta_clicked', { cta: 'word_list_practice_teacher', accuracy: pct });
            teacherCta.onClick?.(e);
          }}
          data-cta="practice-end-teacher"
          className="mt-4 rounded-neo border-3 border-neo-cream/40 bg-neo-navy px-4 py-3 text-center font-neo-display font-black uppercase tracking-wider text-neo-lime shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {labels.teacherCta}
        </a>
      </aside>
    </div>
  );
}
