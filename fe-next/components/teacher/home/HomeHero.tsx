'use client';

import { createElement, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ExternalLink, Gamepad2, Loader2, Play, Plus, RotateCcw, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PressSurface } from '@/components/motion/PressSurface';
import { neoChunkyPress } from '@/components/ui/neoStyles';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { HomeShareSheet } from './HomeShareSheet';
import ClassLimitUpsellModal from '@/components/teacher/ClassLimitUpsellModal';
import { HomeGreeting } from './HomeGreeting';
import { EduMascot } from '@/components/education/EduMascot';
import { NB_PRIMARY_FACE, NB_STICKER, NB_BLOCK } from '../nb/nbStyles';
import { DESK_CODE, HERO_CHIP, HERO_PICK } from './homeStyles';

const PRIMARY_PRESS = cn(NB_PRIMARY_FACE, 'min-h-[72px] w-full whitespace-nowrap text-2xl sm:min-h-[84px] sm:max-w-md sm:text-3xl');
const MENU_ROW = 'min-h-[44px] font-neo-body font-semibold text-edu-ink';
// Home's class name sits on a colour band, the class page's on the page itself. Fill and ink share one literal.
const BAND = {
  pink: 'self-start rounded-neo-lg border-[3px] border-neo-black bg-neo-pink px-3 py-1 text-neo-black shadow-edu-lip-sm sm:px-4',
  purple: 'self-start rounded-neo-lg border-[3px] border-neo-black bg-neo-purple px-3 py-1 text-white shadow-edu-lip-sm sm:px-4',
} as const;

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
  /** A small secondary chip beside Pick a different game. */
  rehearse?: ReactNode;
  meta?: ReactNode;
  /** The greeting line on Home; the class language sticker on its own page. */
  eyebrow?: string | null;
  /** Kept for the class page's caller; the desk itself no longer paints a colour. */
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
  /** Free-plan class cap; null for Pro. When the teacher is at this cap, New class opens the upgrade prompt. */
  classLimit?: number | null;
  /** A class that already played: Play again (last mode, this week's list) takes the primary slot. */
  replay?: HomeReplay;
  startHref?: string;
  /** The page owns the share sheet; without it the hero opens its own. */
  onShare?: () => void;
  testIds?: { start?: string; code?: string; share?: string };
}

/** The class desk: class name, its facts and code, one huge Start, then the second actions. A white card on Home, open on the class page. */
export function HomeHero({
  classrooms, selectedId, onSelect, onStart, language, t, rehearse, meta, eyebrow, titleLevel = 2, tone = 'pink',
  newClassHref, classesHref, classPageLink = true, joinGoal, capLabel, classLimit = null, replay, startHref, onShare, testIds,
}: HomeHeroProps) {
  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const [pending, setPending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const atClassLimit = classLimit !== null && classrooms.length >= classLimit;
  const code = selected?.join_code?.trim() ?? '';
  const pickHref = teacherHostHref(language, { classroomId: selected?.id });
  const begin = () => {
    setPending(true);
    onStart?.();
  };

  const desk = titleLevel === 2;
  const heading = createElement(
    `h${titleLevel}`,
    { id: 'home-hero-title', className: cn('min-w-0 max-w-full font-neo-display text-3xl font-black leading-tight text-edu-ink sm:text-5xl', desk && BAND[tone]) },
    <ClassMenu classrooms={classrooms} selected={selected} onSelect={onSelect} capLabel={capLabel} newClassHref={atClassLimit ? undefined : newClassHref} onNewClass={atClassLimit && newClassHref ? () => setNewClassOpen(true) : undefined} classesHref={classesHref} classPageHref={classPageLink && selected ? `/${language}/teacher/classroom/${selected.id}` : undefined} t={t} />,
  );
  const playIcon = pending
    ? <Loader2 className="size-7 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    : null;

  const codeButton = code ? (
    <CodeChip code={code} big={desk} onShare={() => (onShare ? onShare() : setShareOpen(true))} t={t} testIds={testIds} />
  ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
      {desk && eyebrow ? <HomeGreeting greeting={eyebrow} mascot={false} /> : null}
      <section
        data-testid="home-hero"
        data-tone={tone}
        aria-labelledby="home-hero-title"
        className={cn('flex min-w-0 flex-col gap-4', desk && 'edu-card relative gap-4 p-4 sm:gap-5 sm:p-5 lg:p-6')}
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            {!desk && eyebrow ? <p className={cn(NB_STICKER, NB_BLOCK.cream, 'self-start')}>{eyebrow}</p> : null}
            {heading}
            <div data-testid="home-hero-meta-row" className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              {meta}
              {desk ? null : codeButton}
            </div>
            {desk ? null : joinGoal ? <div data-testid="home-join-goal-line">{joinGoal}</div> : null}
          </div>
          {desk ? (
            <div className="flex min-w-0 shrink-0 flex-col gap-2 lg:flex-row lg:items-start lg:gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                {codeButton}
                {joinGoal ? <div data-testid="home-join-goal-line">{joinGoal}</div> : null}
              </div>
              <span data-testid="home-desk-mascot" aria-hidden="true" className="max-lg:hidden">
                <EduMascot moment="welcome" size={112} className="size-24 shrink-0 xl:size-28" />
              </span>
            </div>
          ) : (
            <span data-testid="class-page-mascot" aria-hidden="true" className="shrink-0 max-lg:hidden">
              <EduMascot moment="welcome" size={112} className="size-24 xl:size-28" />
            </span>
          )}
        </div>

        <div data-testid="home-hero-start-row" className={cn('flex min-w-0 flex-col items-stretch gap-3', desk && 'lg:flex-row lg:gap-4')}>
          {replay?.kind === 'pending' ? (
            <div data-testid="home-start-pending" aria-busy="true" className={cn(PRIMARY_PRESS, neoChunkyPress(6), 'cursor-progress opacity-80', desk && 'lg:max-w-none lg:flex-[1.25]')}>
              <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span className="sr-only">{t('eduShell.home.loop.loading')}</span>
            </div>
          ) : replay?.kind === 'ready' ? (
            <PressSurface asChild lip={6} className={cn(PRIMARY_PRESS, 'group animate-edu-shine', desk && 'lg:max-w-none lg:flex-[1.25]')}>
              <Link href={replay.href} data-testid={testIds?.start ?? 'home-play-again'} data-hero="true" data-magnet aria-busy={pending || undefined} onClick={begin}>
                <span aria-hidden="true" className="edu-shine-track" />
                {playIcon ?? <RotateCcw className="edu-wiggle-on-hover size-7 shrink-0 sm:size-8" strokeWidth={3} aria-hidden="true" />}
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span>{t('eduShell.home.loop.playAgain')}</span>
                  {replay.detail ? <span data-testid="home-play-again-detail" className="max-w-full truncate font-neo-body text-sm font-bold opacity-80 sm:text-base">{replay.detail}</span> : null}
                </span>
              </Link>
            </PressSurface>
          ) : (
            <PressSurface asChild lip={6} className={cn(PRIMARY_PRESS, 'group animate-edu-shine', desk && 'lg:max-w-none lg:flex-[1.25]')}>
              <Link href={startHref ?? pickHref} data-testid={testIds?.start ?? 'home-start-live'} data-hero="true" data-magnet aria-busy={pending || undefined} onClick={begin}>
                <span aria-hidden="true" className="edu-shine-track" />
                {playIcon ?? <Play className="edu-wiggle-on-hover size-7 fill-current" aria-hidden="true" />}
                {t('eduShell.home.startLive')}
              </Link>
            </PressSurface>
          )}
          {rehearse || replay?.kind === 'ready' || replay?.kind === 'pending' ? (
            <div data-testid="home-hero-chips" className={cn('flex min-w-0 flex-wrap items-stretch gap-3 [&>*]:grow [&>*]:basis-56', desk && 'lg:grid lg:flex-[2] lg:auto-cols-fr lg:grid-flow-col')}>
              {rehearse}
              {replay?.kind === 'ready' ? (
                <PressSurface asChild lip={4} className={HERO_PICK}>
                  <Link href={startHref ?? pickHref} data-testid="home-pick-game">
                    <Gamepad2 aria-hidden="true" />
                    <span className="min-w-0">{t('eduShell.home.loop.pickGame')}</span>
                  </Link>
                </PressSurface>
              ) : replay?.kind === 'pending' ? (
                <PressSurface asChild lip={4} className={cn(HERO_PICK, 'invisible')}>
                  <span data-testid="home-pick-game-pending" aria-hidden="true">
                    <Gamepad2 />
                    <span className="min-w-0">{t('eduShell.home.loop.pickGame')}</span>
                  </span>
                </PressSurface>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {atClassLimit ? (
        <ClassLimitUpsellModal
          isOpen={newClassOpen}
          onClose={() => setNewClassOpen(false)}
          currentCount={classrooms.length}
          limit={classLimit}
          reason="class_limit"
        />
      ) : null}

      {selected && code && !onShare ? (
        <HomeShareSheet
          classroom={{ id: selected.id, name: selected.name, join_code: code, member_count: selected.member_count, language: selected.language }}
          open={shareOpen}
          onOpenChange={setShareOpen}
          uiLanguage={language}
          t={t}
        />
      ) : null}
    </div>
  );
}

/** The class code as letter tiles inside the one share button: big on Home's desk, a compact chip on the class page. */
function CodeChip({ code, big, onShare, t, testIds }: { code: string; big: boolean; onShare: () => void; t: T; testIds?: HomeHeroProps['testIds'] }) {
  return (
    <div data-testid="home-join-row" className="inline-flex min-w-0">
      <PressSurface
        lip={big ? 4 : 2}
        data-testid={testIds?.share ?? 'home-share-code'}
        aria-haspopup="dialog"
        aria-label={`${t('eduShell.home.shareCode')}: ${code}`}
        onClick={onShare}
        className={big ? DESK_CODE : cn(HERO_CHIP, 'gap-2')}
      >
        <span className={cn('flex items-center gap-1.5 font-neo-body font-bold text-edu-ink/75', big ? 'text-sm' : 'text-xs')}>
          {t('academy.hq.classCode')}
          {big ? <Share2 className="size-4 shrink-0" aria-hidden="true" /> : null}
        </span>
        <code data-testid={testIds?.code ?? 'home-desk-code'} dir="ltr" className="flex gap-1 font-neo-display font-black text-edu-ink sm:gap-1.5">
          {[...code].map((ch, i) => (
            <span
              key={i}
              data-testid="home-desk-code-tile"
              className={cn('edu-tile', big ? 'size-10 text-2xl sm:size-11' : 'size-7 rounded-neo border-2 text-sm shadow-none')}
            >
              {ch}
            </span>
          ))}
        </code>
        {big ? null : <Share2 className="size-4 shrink-0" aria-hidden="true" />}
      </PressSurface>
    </div>
  );
}

function ClassMenu({ classrooms, selected, onSelect, capLabel, newClassHref, onNewClass, classesHref, classPageHref, t }: {
  classrooms: readonly HomeHeroClass[];
  selected: HomeHeroClass | undefined;
  onSelect: (id: string) => void;
  capLabel?: string;
  newClassHref?: string;
  onNewClass?: () => void;
  classesHref?: string;
  classPageHref?: string;
  t: T;
}) {
  const label = <span dir="auto" className="min-w-0 break-words">{selected?.name}</span>;
  const several = classrooms.length > 1;
  if (!several && !newClassHref && !onNewClass && !classPageHref && !classesHref) {
    return <span data-testid="home-class-switcher" className="inline-flex min-w-0 max-w-full">{label}</span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="home-class-switcher"
        aria-label={several ? t('eduShell.home.switchClass') : undefined}
        className="inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-1 rounded-neo text-start transition-colors duration-150 hover:bg-edu-ink/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line"
      >
        {label}
        <ChevronDown className="size-6 shrink-0 sm:size-8" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto rounded-neo-lg border-[3px] border-edu-line bg-edu-surface p-1.5 shadow-edu-lip">
        {several ? classrooms.map((c) => (
          <DropdownMenuItem key={c.id} data-testid="home-class-option" onSelect={() => onSelect(c.id)} className={MENU_ROW}>
            <Check className={cn('size-4 shrink-0', c.id === selected?.id ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
            <span dir="auto" className="truncate">{c.name}</span>
          </DropdownMenuItem>
        )) : null}
        {several && (classPageHref || newClassHref || onNewClass || classesHref) ? <DropdownMenuSeparator className="bg-edu-ink/10" /> : null}
        {classPageHref ? (
          <DropdownMenuItem asChild className={MENU_ROW}>
            <Link href={classPageHref} data-testid="home-class-page">
              <ExternalLink className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              {t('eduShell.home.classPage')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {onNewClass ? (
          <DropdownMenuItem data-testid="home-new-class" className={MENU_ROW} onSelect={onNewClass}>
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            {t('eduShell.home.newClass')}
          </DropdownMenuItem>
        ) : newClassHref ? (
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
          <p data-testid="home-class-menu-cap" className="mt-1 border-t-2 border-edu-line/10 px-2 pb-1 pt-2 font-neo-body text-xs font-bold text-edu-ink/70">
            {capLabel}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default HomeHero;
