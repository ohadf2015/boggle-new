'use client';

import { createElement, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ExternalLink, Loader2, Play, Plus, RotateCcw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { HomeShareSheet } from './HomeShareSheet';
import { HomeJoinCard } from './HomeJoinCard';
import { MascotBubble } from '../nb/MascotBubble';
import { NB_BLOCK, NB_PANEL, NB_PRIMARY, NB_STICKER } from '../nb/nbStyles';
import { QUIET_LINK } from './homeStyles';

const PRIMARY_SLOT = cn(NB_PRIMARY, 'min-h-[72px] w-full whitespace-nowrap text-2xl sm:min-h-[84px] sm:text-3xl');
const MENU_ROW = 'min-h-[44px] font-neo-body font-semibold text-neo-cream';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface HomeHeroClass {
  id: string;
  name: string;
  join_code?: string;
  member_count?: number | null;
  language?: string | null;
}

export type HomeReplay = { kind: 'pending' } | { kind: 'ready'; href: string; detail: string };

export interface HomeHeroProps {
  classrooms: readonly HomeHeroClass[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Fired before navigating, so the onboarding "first game" step can be recorded. */
  onStart?: () => void;
  language: string;
  t: T;
  /** The one big secondary action under Start. */
  rehearse?: ReactNode;
  meta?: ReactNode;
  /** The greeting in the mascot's bubble on Home; the class language sticker on its own page. */
  eyebrow?: string | null;
  /** What the mascot says under the greeting. */
  cue?: string | null;
  /** The desk colour: pink on Home, purple on the class page. */
  tone?: 'pink' | 'purple';
  /** 2 on Home, where the greeting is the page heading; 1 on the class page. */
  titleLevel?: 1 | 2;
  newClassHref?: string;
  /** The full classes list, offered in the class menu. */
  classesHref?: string;
  /** False on the class page itself. */
  classPageLink?: boolean;
  /** The live joined-vs-goal line for a class still filling up. */
  joinGoal?: ReactNode;
  /** Free-plan class count ("2 of 3 free classes used"), shown inside the class menu; omit for Pro. */
  capLabel?: string;
  /** A class that already played: Play again (last mode, this week's list) takes the primary slot. */
  replay?: HomeReplay;
  startHref?: string;
  /** The page owns the share sheet; without it the hero opens its own. */
  onShare?: () => void;
  testIds?: { start?: string; code?: string; share?: string };
}

/** The class desk: a colour panel with the class, one huge Start, one big secondary and the yellow join card; on Home the mascot greets above it. */
export function HomeHero({
  classrooms, selectedId, onSelect, onStart, language, t, rehearse, meta, eyebrow, cue, titleLevel = 2, tone = 'pink',
  newClassHref, classesHref, classPageLink = true, joinGoal, capLabel, replay, startHref, onShare, testIds,
}: HomeHeroProps) {
  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const [pending, setPending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const code = selected?.join_code?.trim() ?? '';
  const pickHref = teacherHostHref(language, { classroomId: selected?.id });
  const begin = () => {
    setPending(true);
    onStart?.();
  };

  const heading = createElement(
    `h${titleLevel}`,
    { id: 'home-hero-title', className: 'min-w-0 font-neo-display text-3xl font-black leading-tight text-white sm:text-5xl [@media(max-height:820px)]:sm:text-4xl' },
    <ClassMenu classrooms={classrooms} selected={selected} onSelect={onSelect} capLabel={capLabel} newClassHref={newClassHref} classesHref={classesHref} classPageHref={classPageLink && selected ? `/${language}/teacher/classroom/${selected.id}` : undefined} t={t} />,
  );
  const greetingHeader = titleLevel === 2 && (eyebrow || cue) ? (
    <header data-testid="home-greeting-row" className="min-w-0">
      <MascotBubble pose="welcome" size={72} className="min-w-0 lg:[&>img]:size-20">
        {eyebrow ? <h1 suppressHydrationWarning className="font-neo-display text-lg font-black leading-tight text-neo-black sm:text-xl">{eyebrow}</h1> : null}
        {cue ? <p data-testid="home-coach-cue" suppressHydrationWarning className="font-neo-body text-sm font-semibold leading-snug text-neo-black/80 sm:text-base">{cue}</p> : null}
      </MascotBubble>
    </header>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
    {greetingHeader}
    <section data-testid="home-hero" data-tone={tone} aria-labelledby="home-hero-title" className={cn(NB_PANEL, NB_BLOCK[tone], 'relative flex flex-col justify-center @container/hero')}>
      <div
        data-testid="home-hero-grid"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:gap-5 sm:p-6 @3xl/hero:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @3xl/hero:grid-rows-[auto_1fr] @3xl/hero:gap-x-8 @3xl/hero:p-8 [@media(max-height:820px)]:gap-3 [@media(max-height:820px)]:@3xl/hero:p-5"
      >
        <div className="flex min-w-0 flex-col gap-1.5 @3xl/hero:col-start-1 @3xl/hero:row-start-1">
          {titleLevel === 1 && eyebrow ? (
            <p className={cn(NB_STICKER, NB_BLOCK.cream, 'self-start')}>{eyebrow}</p>
          ) : null}
          {heading}
          {meta ? <div data-testid="home-hero-meta-row" className="mt-1">{meta}</div> : null}
        </div>

        <div data-testid="home-hero-start-row" className="flex flex-col items-stretch gap-3 @3xl/hero:col-start-1 @3xl/hero:row-start-2 @3xl/hero:self-end">
          {replay?.kind === 'pending' ? (
            <div data-testid="home-start-pending" aria-busy="true" className={cn(PRIMARY_SLOT, 'cursor-progress opacity-80')}>
              <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span className="sr-only">{t('eduShell.home.loop.loading')}</span>
            </div>
          ) : replay?.kind === 'ready' ? (
            <Link href={replay.href} data-testid={testIds?.start ?? 'home-play-again'} data-hero="true" data-magnet aria-busy={pending || undefined} onClick={begin} className={cn(PRIMARY_SLOT, 'group animate-edu-shine')}>
              <span aria-hidden="true" className="edu-shine-track" />
              {pending ? (
                <Loader2 className="size-6 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <RotateCcw className="edu-wiggle-on-hover size-7 shrink-0" strokeWidth={3} aria-hidden="true" />
              )}
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span>{t('eduShell.home.loop.playAgain')}</span>
                {replay.detail ? <span data-testid="home-play-again-detail" className="max-w-full truncate font-neo-body text-sm font-bold opacity-80">{replay.detail}</span> : null}
              </span>
            </Link>
          ) : (
            <Link href={startHref ?? pickHref} data-testid={testIds?.start ?? 'home-start-live'} data-hero="true" data-magnet aria-busy={pending || undefined} onClick={begin} className={cn(PRIMARY_SLOT, 'group animate-edu-shine')}>
              <span aria-hidden="true" className="edu-shine-track" />
              {pending ? (
                <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Play className="edu-wiggle-on-hover size-7 fill-current" aria-hidden="true" />
              )}
              {t('eduShell.home.startLive')}
            </Link>
          )}
          {rehearse}
          {replay?.kind === 'ready' ? (
            <Link href={startHref ?? pickHref} data-testid="home-pick-game" className={cn(QUIET_LINK, 'self-center text-white/90 hover:text-white')}>
              {t('eduShell.home.loop.pickGame')}
            </Link>
          ) : null}
        </div>

        {code ? (
          <HomeJoinCard
            code={code}
            joinGoal={joinGoal}
            onShare={() => (onShare ? onShare() : setShareOpen(true))}
            t={t}
            testIds={testIds}
            className="@3xl/hero:col-start-2 @3xl/hero:row-span-2 @3xl/hero:row-start-1 @3xl/hero:self-center"
          />
        ) : null}
      </div>

      {selected && code && !onShare ? (
        <HomeShareSheet
          classroom={{ id: selected.id, name: selected.name, join_code: code, member_count: selected.member_count, language: selected.language }}
          open={shareOpen}
          onOpenChange={setShareOpen}
          uiLanguage={language}
          t={t}
        />
      ) : null}
    </section>
    </div>
  );
}

function ClassMenu({ classrooms, selected, onSelect, capLabel, newClassHref, classesHref, classPageHref, t }: {
  classrooms: readonly HomeHeroClass[];
  selected: HomeHeroClass | undefined;
  onSelect: (id: string) => void;
  capLabel?: string;
  newClassHref?: string;
  classesHref?: string;
  classPageHref?: string;
  t: T;
}) {
  const label = <span dir="auto" className="min-w-0 break-words">{selected?.name}</span>;
  const several = classrooms.length > 1;
  if (!several && !newClassHref && !classPageHref && !classesHref) {
    return <span data-testid="home-class-switcher" className="inline-flex min-w-0 max-w-full">{label}</span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="home-class-switcher"
        aria-label={several ? t('eduShell.home.switchClass') : undefined}
        className="inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-1 rounded-neo text-start transition-colors duration-150 hover:bg-neo-cream/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream"
      >
        {label}
        <ChevronDown className="size-6 shrink-0 sm:size-8" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-1 shadow-hard">
        {several ? classrooms.map((c) => (
          <DropdownMenuItem key={c.id} data-testid="home-class-option" onSelect={() => onSelect(c.id)} className={MENU_ROW}>
            <Check className={cn('size-4 shrink-0', c.id === selected?.id ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
            <span dir="auto" className="truncate">{c.name}</span>
          </DropdownMenuItem>
        )) : null}
        {several && (classPageHref || newClassHref || classesHref) ? <DropdownMenuSeparator className="bg-neo-cream/10" /> : null}
        {classPageHref ? (
          <DropdownMenuItem asChild className={MENU_ROW}>
            <Link href={classPageHref} data-testid="home-class-page">
              <ExternalLink className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              {t('eduShell.home.classPage')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {newClassHref ? (
          <DropdownMenuItem asChild className={MENU_ROW}>
            <Link href={newClassHref} data-testid="home-new-class">
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              {t('eduShell.home.newClass')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {classesHref ? (
          <DropdownMenuItem asChild className={MENU_ROW}>
            <Link href={classesHref} data-testid="home-all-classes">
              <Users className="size-4 shrink-0" aria-hidden="true" />
              {t('eduShell.home.yourClasses')}
            </Link>
          </DropdownMenuItem>
        ) : null}
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
