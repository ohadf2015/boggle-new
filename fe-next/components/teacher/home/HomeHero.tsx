'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Loader2, Play, RotateCcw, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { HomeShareSheet } from './HomeShareSheet';
import { JoinCodeTile } from '@/components/teacher/hq/JoinCodeTile';
import { NB_BLOCK, NB_PANEL, NB_PRIMARY } from '../nb/nbStyles';
import { QUIET_LINK } from './homeStyles';
import { NeoButton } from '@/components/ui/button';

const PRIMARY_SLOT = cn(NB_PRIMARY, 'min-h-[60px] w-full whitespace-nowrap text-2xl sm:w-auto sm:min-w-[16rem] @3xl/hero:w-full');

type T = (key: string, params?: Record<string, string | number>) => string;

export interface HomeHeroClass {
  id: string;
  name: string;
  join_code?: string;
  member_count?: number | null;
  language?: string | null;
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
  meta?: ReactNode;
  corner?: ReactNode;
  /** False while the Get students in card owns the code, so it never shows twice. */
  showCode?: boolean;
  /** Replaces the code panel: the Get students in card for a class still below its student goal. */
  codeSlot?: ReactNode;
  /** Free-plan class count ("2 of 3 free classes used"), shown inside the class menu; omit for Pro. */
  capLabel?: string;
  /** A class that already played: Play again (last mode, this week's list) takes the primary slot. */
  replay?: HomeReplay;
}

export type HomeReplay = { kind: 'pending' } | { kind: 'ready'; href: string; detail: string };

/** The class desk: the class, its join code large with Share beside it, and one Start button. */
export function HomeHero({ classrooms, selectedId, onSelect, onStart, language, t, rehearse, meta, corner, showCode = true, codeSlot, capLabel, replay }: HomeHeroProps) {
  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const [pending, setPending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const code = showCode ? (selected?.join_code?.trim() ?? '') : '';

  return (
    <section data-testid="home-hero" aria-labelledby="home-hero-title" className={cn(NB_PANEL, NB_BLOCK.pink, 'relative @container/hero')}>
      <div
        data-testid="home-hero-grid"
        className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3 sm:gap-4 sm:p-5 @3xl/hero:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] @3xl/hero:grid-rows-[auto_1fr] @3xl/hero:gap-x-6 [@media(max-height:820px)]:gap-2.5 [@media(max-height:820px)]:p-3.5"
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
            className="flex flex-col items-center gap-2.5 rounded-neo-lg border-[3px] border-neo-black bg-neo-yellow p-2.5 text-neo-black shadow-hard-lg sm:p-4 @3xl/hero:col-start-2 @3xl/hero:row-span-2 @3xl/hero:row-start-1 @3xl/hero:self-center"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-neo-body text-xs font-black uppercase tracking-wide text-neo-black/75">{t('academy.hq.classCode')}</span>
              <NeoButton
                variant="small"
                tone="navy"
                data-testid="home-share-code"
                aria-haspopup="dialog"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-5" aria-hidden="true" />
                {t('eduShell.home.shareCode')}
              </NeoButton>
            </div>
            <p data-testid="home-desk-code" className="flex gap-1 sm:gap-1.5" dir="ltr">
              <span className="sr-only">{code}</span>
              {Array.from(code).map((ch, i, all) => (
                <JoinCodeTile
                  key={`${ch}-${i}`}
                  ch={ch}
                  index={i}
                  count={all.length}
                  data-testid="home-desk-code-tile"
                  className="size-11 rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-2xl font-black uppercase text-neo-black shadow-hard max-[379px]:size-9 max-[379px]:text-xl sm:size-14 sm:text-3xl @3xl/hero:text-4xl @5xl/hero:size-16 @5xl/hero:text-5xl [@media(max-height:820px)]:sm:size-12 [@media(max-height:820px)]:sm:text-2xl"
                />
              ))}
            </p>
          </div>
        ) : null}

        <div
          data-testid="home-hero-start-row"
          className="flex flex-col items-stretch gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 @3xl/hero:col-start-1 @3xl/hero:row-start-2 @3xl/hero:flex-col @3xl/hero:items-stretch @3xl/hero:self-end"
        >
          {replay?.kind === 'pending' ? (
            <div data-testid="home-start-pending" aria-busy="true" className={cn(PRIMARY_SLOT, 'cursor-progress opacity-80')}>
              <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span className="sr-only">{t('eduShell.home.loop.loading')}</span>
            </div>
          ) : replay?.kind === 'ready' ? (
            <Link
              href={replay.href}
              data-testid="home-play-again"
              data-magnet
              aria-busy={pending || undefined}
              onClick={() => {
                setPending(true);
                onStart?.();
              }}
              className={cn(PRIMARY_SLOT, 'group animate-edu-shine')}
            >
              <span aria-hidden="true" className="edu-shine-track" />
              {pending ? (
                <Loader2 className="size-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <RotateCcw className="edu-wiggle-on-hover size-6 shrink-0" strokeWidth={3} aria-hidden="true" />
              )}
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span>{t('eduShell.home.loop.playAgain')}</span>
                {replay.detail ? <span data-testid="home-play-again-detail" className="max-w-full truncate font-neo-body text-sm font-bold opacity-80">{replay.detail}</span> : null}
              </span>
            </Link>
          ) : (
            <Link
              href={teacherHostHref(language, { classroomId: selected?.id })}
              data-testid="home-start-live"
              data-magnet
              aria-busy={pending || undefined}
              onClick={() => {
                setPending(true);
                onStart?.();
              }}
              className={cn(PRIMARY_SLOT, 'group animate-edu-shine')}
            >
              <span aria-hidden="true" className="edu-shine-track" />
              {pending ? (
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Play className="edu-wiggle-on-hover size-6 fill-current" aria-hidden="true" />
              )}
              {t('eduShell.home.startLive')}
            </Link>
          )}
          {rehearse || replay?.kind === 'ready' ? (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0 sm:justify-start @3xl/hero:justify-center">
              {replay?.kind === 'ready' ? (
                <Link href={teacherHostHref(language, { classroomId: selected?.id })} data-testid="home-pick-game" className={cn(QUIET_LINK, 'text-white/90 hover:text-white')}>
                  {t('eduShell.home.loop.pickGame')}
                </Link>
              ) : null}
              {rehearse}
            </div>
          ) : null}
        </div>

      </div>

      {selected && code ? (
        <HomeShareSheet
          classroom={{ id: selected.id, name: selected.name, join_code: code, member_count: selected.member_count, language: selected.language }}
          open={shareOpen}
          onOpenChange={setShareOpen}
          uiLanguage={language}
          t={t}
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
