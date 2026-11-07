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
import { JoinCodeTile } from '@/components/teacher/hq/JoinCodeTile';
import { NB_BLOCK, NB_PANEL, NB_PRIMARY, NB_SMALL } from '../nb/nbStyles';

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
  /** Free-plan class count ("2 of 3 free classes used"), shown inside the class menu; omit for Pro. */
  capLabel?: string;
}

/** The class desk: which class, its join code at a glance, and the one Start button. */
export function HomeHero({ classrooms, selectedId, onSelect, onStart, language, t, rehearse, nudge, meta, insight, corner, showCode = true, codeSlot, capLabel }: HomeHeroProps) {
  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const [pending, setPending] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const code = showCode ? (selected?.join_code?.trim() ?? '') : '';

  return (
    <section data-testid="home-hero" aria-labelledby="home-hero-title" className={cn(NB_PANEL, NB_BLOCK.pink, 'relative @container/hero')}>
      <div
        data-testid="home-hero-grid"
        className="grid gap-3 p-3 sm:gap-4 sm:p-5 @3xl/hero:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @3xl/hero:grid-rows-[auto_1fr] @3xl/hero:gap-x-6 [@media(max-height:820px)]:gap-2.5 [@media(max-height:820px)]:p-3.5"
      >
        <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5 @3xl/hero:col-start-1 @3xl/hero:row-start-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="whitespace-nowrap font-neo-body text-sm font-black text-white/85">{t('eduShell.home.startWith')}</span>
            {corner}
          </div>
          <h2 id="home-hero-title" className="min-w-0 font-neo-display text-3xl font-black leading-tight text-white sm:text-4xl [@media(max-height:820px)]:text-3xl">
            <ClassPicker classrooms={classrooms} selected={selected} onSelect={onSelect} capLabel={capLabel} t={t} />
          </h2>
          {meta}
        </div>

        {codeSlot ? (
          <div data-testid="home-hero-code-slot" className="min-w-0 @3xl/hero:col-start-2 @3xl/hero:row-span-2 @3xl/hero:row-start-1 @3xl/hero:self-center">
            {codeSlot}
          </div>
        ) : code ? (
          <div
            data-testid="home-desk-code-panel"
            className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-yellow p-2.5 text-neo-black shadow-hard-lg sm:gap-x-3 sm:p-3.5 @3xl/hero:col-start-2 @3xl/hero:row-span-2 @3xl/hero:row-start-1 @3xl/hero:self-center"
          >
            <span className="w-full font-neo-body text-xs font-black uppercase tracking-wide text-neo-black/75 max-sm:sr-only">{t('academy.hq.classCode')}</span>
            <p data-testid="home-desk-code" className="flex gap-1 sm:gap-1.5" dir="ltr">
              <span className="sr-only">{code}</span>
              {Array.from(code).map((ch, i, all) => (
                <JoinCodeTile
                  key={`${ch}-${i}`}
                  ch={ch}
                  index={i}
                  count={all.length}
                  data-testid="home-desk-code-tile"
                  className="size-9 rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-xl font-black uppercase text-neo-black shadow-hard max-[379px]:size-8 max-[379px]:text-lg sm:size-12 sm:text-2xl [@media(max-height:820px)]:sm:size-10 [@media(max-height:820px)]:text-xl"
                />
              ))}
            </p>
            <button
              type="button"
              data-testid="home-class-code"
              onClick={() => setProjectorOpen(true)}
              aria-label={t('eduShell.home.showCodeFor', { name: selected?.name ?? '' })}
              title={t('academy.hq.openProjector')}
              className={cn(NB_SMALL, NB_BLOCK.navy, 'max-sm:min-w-11 max-sm:px-0')}
            >
              <Projector className="size-5" aria-hidden="true" />
              <span className="max-sm:hidden">{t('academy.hq.openProjector')}</span>
            </button>
          </div>
        ) : null}

        <div
          data-testid="home-hero-start-row"
          className="flex flex-col items-stretch gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 @3xl/hero:col-start-1 @3xl/hero:row-start-2 @3xl/hero:flex-col @3xl/hero:items-stretch @3xl/hero:self-end"
        >
          <Link
            href={teacherHostHref(language, { classroomId: selected?.id })}
            data-testid="home-start-live"
            data-magnet
            aria-busy={pending || undefined}
            onClick={() => {
              setPending(true);
              onStart?.();
            }}
            className={cn(NB_PRIMARY, 'group animate-edu-shine min-h-[60px] w-full whitespace-nowrap text-2xl sm:w-auto sm:min-w-[16rem] @3xl/hero:w-full')}
          >
            <span aria-hidden="true" className="edu-shine-track" />
            {pending ? (
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Play className="edu-wiggle-on-hover size-6 fill-current" aria-hidden="true" />
            )}
            {t('eduShell.home.startLive')}
          </Link>
          {rehearse ? <div className="flex justify-center sm:justify-start @3xl/hero:justify-center">{rehearse}</div> : null}
        </div>

        {codeSlot || !insight ? null : <div className="max-sm:hidden @3xl/hero:col-span-2 [@media(max-height:780px)]:hidden">{insight}</div>}
        {nudge ? <div className="min-w-0 @3xl/hero:col-span-2">{nudge}</div> : null}
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
  capLabel,
  t,
}: {
  classrooms: readonly HomeHeroClass[];
  selected: HomeHeroClass | undefined;
  onSelect: (id: string) => void;
  capLabel?: string;
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
        {capLabel ? (
          <p data-testid="home-class-menu-cap" className="mt-1 border-t-2 border-neo-cream/10 px-2 pb-1 pt-2 font-neo-body text-xs font-bold text-neo-cream/70">
            {capLabel}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default HomeHero;
