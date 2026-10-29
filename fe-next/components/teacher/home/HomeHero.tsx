'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Loader2, Play, Projector } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EduMascot } from '@/components/education/EduMascot';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { PANEL, PRIMARY_BUTTON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface HomeHeroClass {
  id: string;
  name: string;
  join_code?: string;
  member_count?: number | null;
}

export interface HomeHeroProps {
  classrooms: readonly HomeHeroClass[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Fired before navigating, so the onboarding "first game" step can be recorded. */
  onStart?: () => void;
  language: string;
  t: T;
  /** Quiet secondary action beside Start: a private practice round with bots. */
  rehearse?: ReactNode;
  /** The next setup step, inline under the actions instead of a row above the hero. */
  nudge?: ReactNode;
  meta?: ReactNode;
  /** The reason to play today ("19 days since the last game"), next to the button that answers it. */
  insight?: ReactNode;
  corner?: ReactNode;
  /** False while the Get students in card owns the code, so it never shows twice. */
  showCode?: boolean;
}

const TILE_TILT = [-2.5, 1.5, -1, 2, -1.5, 1] as const;

/** The class desk: which class, its join code at a glance, and the one Start button. */
export function HomeHero({ classrooms, selectedId, onSelect, onStart, language, t, rehearse, nudge, meta, insight, corner, showCode = true }: HomeHeroProps) {
  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const [pending, setPending] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const code = showCode ? (selected?.join_code?.trim() ?? '') : '';

  return (
    <section data-testid="home-hero" aria-labelledby="home-hero-title" className={cn(PANEL, 'relative overflow-hidden')}>
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-neo-body text-sm font-bold text-neo-cream/75 sm:text-base">{t('eduShell.home.startWith')}</span>
            {corner}
          </div>
          <h2 id="home-hero-title" className="min-w-0 font-neo-display text-3xl font-black leading-[1.05] text-neo-lime sm:text-4xl xl:text-5xl">
            <ClassPicker classrooms={classrooms} selected={selected} onSelect={onSelect} t={t} />
          </h2>
          {meta}
        </div>

        {code ? (
          <div
            data-testid="home-desk-code-panel"
            className="relative flex flex-wrap items-center gap-x-5 gap-y-3 rounded-neo-lg border-[3px] border-neo-black bg-neo-cyan p-4 text-neo-black shadow-hard 2xl:pe-28"
          >
            <EduMascot
              moment="scanJoin"
              size={112}
              className="pointer-events-none absolute -bottom-2 end-1 hidden size-24 2xl:block motion-safe:animate-[edu-mascot-bob_4.5s_ease-in-out_infinite]"
            />
            <span className="w-full font-neo-display text-sm font-black uppercase tracking-wide xl:w-auto">{t('academy.hq.classCode')}</span>
            <p data-testid="home-desk-code" className="flex gap-1.5 sm:gap-2" dir="ltr">
              <span className="sr-only">{code}</span>
              {Array.from(code).map((ch, i) => (
                <span
                  key={`${ch}-${i}`}
                  aria-hidden="true"
                  data-testid="home-desk-code-tile"
                  style={{ rotate: `${TILE_TILT[i % TILE_TILT.length]}deg`, animationDelay: `${i * 45}ms` }}
                  className="grid size-10 place-items-center rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-xl font-black uppercase text-neo-black shadow-hard-sm sm:size-14 sm:text-3xl lg:size-12 lg:text-2xl 2xl:size-14 2xl:text-3xl motion-safe:animate-[edu-tile-drop_420ms_cubic-bezier(0.23,1,0.32,1)_both]"
                >
                  {ch}
                </span>
              ))}
            </p>
            <button
              type="button"
              data-testid="home-class-code"
              onClick={() => setProjectorOpen(true)}
              aria-label={t('eduShell.home.showCodeFor', { name: selected?.name ?? '' })}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-navy bg-neo-navy px-4 font-neo-display text-base font-black text-neo-cream shadow-hard-sm',
                'transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-hard active:scale-[0.97] motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-navy focus-visible:ring-offset-2 focus-visible:ring-offset-neo-cyan',
              )}
            >
              <Projector className="size-5" aria-hidden="true" />
              {t('academy.hq.openProjector')}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
          <Link
            href={teacherHostHref(language, { classroomId: selected?.id })}
            data-testid="home-start-live"
            data-magnet
            aria-busy={pending || undefined}
            onClick={() => {
              setPending(true);
              onStart?.();
            }}
            className={cn(PRIMARY_BUTTON, 'min-h-[60px] w-full text-xl sm:w-auto sm:min-w-[18rem]')}
          >
            {pending ? (
              <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Play className="size-6 fill-current" aria-hidden="true" />
            )}
            {t('eduShell.home.startLive')}
          </Link>
          {rehearse}
        </div>

        {insight || nudge ? (
          <div className="flex min-w-0 flex-col gap-3">
            {insight ? <div className="rounded-neo border-[2px] border-neo-cream/50 bg-neo-navy p-3">{insight}</div> : null}
            {nudge}
          </div>
        ) : null}
      </div>

      {projectorOpen && selected && code ? (
        <HqProjectorSheet
          classroom={{ id: selected.id, name: selected.name, join_code: code, member_count: selected.member_count ?? undefined }}
          onClose={() => setProjectorOpen(false)}
        />
      ) : null}
    </section>
  );
}

function ClassPicker({
  classrooms,
  selected,
  onSelect,
  t,
}: {
  classrooms: readonly HomeHeroClass[];
  selected: HomeHeroClass | undefined;
  onSelect: (id: string) => void;
  t: T;
}) {
  const label = <span dir="auto" className="min-w-0 break-words">{selected?.name}</span>;
  if (classrooms.length < 2) {
    return (
      <span data-testid="home-class-switcher" className="inline-flex min-w-0 max-w-full">
        {label}
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="home-class-switcher"
        aria-label={t('eduShell.home.switchClass')}
        className={cn(
          'inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-1 rounded-neo border-b-[3px] border-dashed border-neo-lime px-1 text-start',
          'transition-colors duration-150 hover:bg-neo-lime/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        {label}
        <ChevronDown className="size-7 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto rounded-neo border-[3px] border-neo-cream bg-neo-navy-light p-1 shadow-hard">
        {classrooms.map((c) => (
          <DropdownMenuItem
            key={c.id}
            data-testid="home-class-option"
            onSelect={() => onSelect(c.id)}
            className="min-h-[44px] font-neo-body font-semibold text-neo-cream"
          >
            <Check className={cn('size-4 shrink-0', c.id === selected?.id ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
            <span dir="auto" className="truncate">{c.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default HomeHero;
