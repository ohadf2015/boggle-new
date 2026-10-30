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
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { OUTLINE_BUTTON, PANEL, PRIMARY_BUTTON } from './homeStyles';

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
  /** Replaces the code panel: the Get students in card for a class still below its student goal. */
  codeSlot?: ReactNode;
}

/** The class desk: which class, its join code at a glance, and the one Start button. */
export function HomeHero({ classrooms, selectedId, onSelect, onStart, language, t, rehearse, nudge, meta, insight, corner, showCode = true, codeSlot }: HomeHeroProps) {
  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const [pending, setPending] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const code = showCode ? (selected?.join_code?.trim() ?? '') : '';

  return (
    <section data-testid="home-hero" aria-labelledby="home-hero-title" className={cn(PANEL, 'relative')}>
      <div className="flex flex-col gap-2.5 p-3 sm:gap-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-neo-body text-sm font-bold text-neo-cream/70">{t('eduShell.home.startWith')}</span>
            {corner}
          </div>
          <h2 id="home-hero-title" className="min-w-0 font-neo-display text-2xl font-black leading-tight text-neo-cream sm:text-3xl">
            <ClassPicker classrooms={classrooms} selected={selected} onSelect={onSelect} t={t} />
          </h2>
          {meta}
        </div>

        {codeSlot ?? (code ? (
          <div
            data-testid="home-desk-code-panel"
            className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-neo border-2 border-neo-cream/35 bg-neo-navy p-2.5 sm:gap-x-3 sm:p-3"
          >
            <span className="w-full font-neo-body text-xs font-bold text-neo-cream/70 max-sm:sr-only">{t('academy.hq.classCode')}</span>
            <p data-testid="home-desk-code" className="flex gap-1 sm:gap-1.5" dir="ltr">
              <span className="sr-only">{code}</span>
              {Array.from(code).map((ch, i) => (
                <span
                  key={`${ch}-${i}`}
                  aria-hidden="true"
                  data-testid="home-desk-code-tile"
                  className="grid size-9 place-items-center rounded-neo border-2 border-neo-black bg-neo-cream font-neo-display text-lg font-black uppercase text-neo-black sm:size-11 sm:text-2xl"
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
              title={t('academy.hq.openProjector')}
              className={cn(OUTLINE_BUTTON, 'max-sm:min-w-11 max-sm:px-0')}
            >
              <Projector className="size-5" aria-hidden="true" />
              <span className="max-sm:hidden">{t('academy.hq.openProjector')}</span>
            </button>
          </div>
        ) : null)}

        <div className="flex items-center gap-x-2 gap-y-1 sm:flex-wrap sm:gap-x-4">
          <Link
            href={teacherHostHref(language, { classroomId: selected?.id })}
            data-testid="home-start-live"
            data-magnet
            aria-busy={pending || undefined}
            onClick={() => {
              setPending(true);
              onStart?.();
            }}
            className={cn(PRIMARY_BUTTON, 'whitespace-nowrap max-sm:min-w-0 max-sm:flex-1 max-sm:px-3 sm:min-w-[16rem]')}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Play className="size-5 fill-current" aria-hidden="true" />
            )}
            {t('eduShell.home.startLive')}
          </Link>
          {rehearse}
        </div>

        {codeSlot ? null : insight}
        {nudge}
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
          'inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-1 rounded-neo border-b-2 border-dashed border-neo-cream/40 px-1 text-start',
          'transition-colors duration-150 hover:bg-neo-cream/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream',
        )}
      >
        {label}
        <ChevronDown className="size-6 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-1 shadow-hard">
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
