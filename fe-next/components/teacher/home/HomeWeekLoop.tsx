'use client';

import Link from 'next/link';
import { BookOpenCheck, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadyForTest } from './weekLoopModel';

type T = (key: string, params?: Record<string, string | number>) => string;

const PILL =
  'inline-flex min-h-11 items-center gap-1.5 rounded-neo-lg border-[3px] border-neo-black px-3 font-neo-body text-sm font-black leading-tight shadow-hard transition-transform duration-150 hover:-translate-y-px active:translate-y-px active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream motion-reduce:transition-none';

export interface HomeWeekLoopProps {
  ready: ReadyForTest | null;
  missed: readonly string[];
  reportsHref: string;
  onHomework: () => void;
  t: T;
}

export function HomeWeekLoop({ ready, missed, reportsHref, onHomework, t }: HomeWeekLoopProps) {
  if (!ready && missed.length === 0) return null;
  return (
    <div data-testid="home-week-loop" className="flex flex-wrap items-center gap-2">
      {ready?.kind === 'counts' ? (
        <Link
          href={reportsHref}
          data-testid="home-ready-chip"
          title={t('eduShell.home.loop.readyHint')}
          className={cn(PILL, 'bg-neo-cream text-neo-black')}
        >
          <BookOpenCheck className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          {t('eduShell.home.loop.ready', { ready: ready.ready, total: ready.rated })}
          <ChevronRight className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      ) : ready?.kind === 'noResults' ? (
        <p data-testid="home-ready-empty" className="font-neo-body text-sm font-bold text-white/85">
          {t('eduShell.home.loop.readyEmpty')}
        </p>
      ) : null}
      {missed.length > 0 ? (
        <button
          type="button"
          data-testid="home-homework"
          title={missed.join(', ')}
          onClick={onHomework}
          className={cn(PILL, 'bg-neo-cream text-neo-black')}
        >
          <Send className="size-4 shrink-0 rtl:-scale-x-100" strokeWidth={2.5} aria-hidden="true" />
          {t('eduShell.home.loop.missed', { count: missed.length })}
        </button>
      ) : null}
    </div>
  );
}
