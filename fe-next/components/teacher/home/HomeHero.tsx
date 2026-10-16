'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EduMascot } from '@/components/education/EduMascot';
import { DeliveryTag } from '@/components/education/DeliveryTag';
import { ACCENT_FILL } from '@/components/education/ClassroomModeCatalogueCard';
import { catalogueEntry, FEATURED_HOME_MODES } from '@/components/education/ClassroomModeCatalogueData';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { PANEL, PRIMARY_BUTTON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface HomeHeroClass {
  id: string;
  name: string;
}

export interface HomeHeroProps {
  classrooms: readonly HomeHeroClass[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Fired before navigating, so the onboarding "first game" step can be recorded. */
  onStart?: () => void;
  language: string;
  t: T;
}

/** "Start a game with <class>": the one primary action on Home, plus three featured modes. */
export function HomeHero({ classrooms, selectedId, onSelect, onStart, language, t }: HomeHeroProps) {
  const selected = classrooms.find((c) => c.id === selectedId) ?? classrooms[0];
  const [pending, setPending] = useState<string | null>(null);
  const go = (key: string) => {
    setPending(key);
    onStart?.();
  };

  return (
    <section data-testid="home-hero" aria-labelledby="home-hero-title" className={cn(PANEL, 'relative overflow-hidden p-4 sm:p-6')}>
      <EduMascot
        moment="gameStart"
        size={176}
        className="pointer-events-none absolute -end-2 -top-2 hidden size-44 sm:block lg:size-48 motion-safe:animate-[edu-mascot-bob_4.5s_ease-in-out_infinite]"
      />
      <div className="relative flex flex-col gap-4 sm:max-w-[calc(100%-11rem)]">
        <h2 id="home-hero-title" className="flex flex-wrap items-center gap-x-2 gap-y-1 font-neo-display text-2xl font-black leading-tight text-neo-cream sm:text-3xl">
          <span>{t('eduShell.home.startWith')}</span>
          <ClassPicker classrooms={classrooms} selected={selected} onSelect={onSelect} t={t} />
        </h2>
        <Link
          href={teacherHostHref(language, { classroomId: selected?.id })}
          data-testid="home-start-live"
          aria-busy={pending === 'live' || undefined}
          onClick={() => go('live')}
          className={cn(PRIMARY_BUTTON, 'w-full text-xl sm:w-auto sm:min-w-[18rem] sm:self-start')}
        >
          {pending === 'live' ? (
            <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Play className="size-6 fill-current" aria-hidden="true" />
          )}
          {t('eduShell.home.startLive')}
        </Link>
      </div>

      <ul className="relative mt-10 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
        {FEATURED_HOME_MODES.map((id) => {
          const mode = catalogueEntry(id);
          if (!mode) return null;
          return (
            <li key={id} className="min-w-0">
              <Link
                href={teacherHostHref(language, { classroomId: selected?.id, mode: id })}
                data-testid={`home-mode-${id}`}
                onClick={() => go(id)}
                aria-busy={pending === id || undefined}
                className={cn(
                  'group flex h-full min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-neo border-[3px] border-neo-black p-2 text-center text-neo-black shadow-hard-sm sm:flex-row sm:justify-start sm:gap-2 sm:p-3 sm:text-start',
                  'transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-hard active:scale-[0.97] motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                  ACCENT_FILL[mode.accent],
                )}
              >
                {pending === id ? (
                  <Loader2 className="-mt-9 size-16 shrink-0 animate-spin p-4 motion-reduce:animate-none sm:-mt-7 sm:size-20" aria-hidden="true" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- transparent mode sticker
                  <img src={mode.poster} alt="" aria-hidden="true" width={96} height={96} className="-mt-9 size-16 shrink-0 object-contain drop-shadow-[3px_3px_0_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out motion-reduce:transition-none sm:-mt-7 sm:size-20 [@media(hover:hover)]:group-hover:-rotate-6 [@media(hover:hover)]:group-hover:scale-110" />
                )}
                <span className="flex min-w-0 flex-col items-center gap-1 sm:flex-1 sm:items-start">
                  <span className="line-clamp-2 font-neo-display text-sm font-black leading-tight sm:text-base">{t(mode.nameKey)}</span>
                  <DeliveryTag delivery={mode.delivery} t={t} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
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
  const label = <span dir="auto" className="truncate">{selected?.name}</span>;
  if (classrooms.length < 2) {
    return (
      <span data-testid="home-class-switcher" className="inline-flex min-w-0 max-w-full text-neo-lime">
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
          'inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-1 rounded-neo border-b-[3px] border-dashed border-neo-lime px-1 text-neo-lime',
          'transition-colors duration-150 hover:bg-neo-lime/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        {label}
        <ChevronDown className="size-6 shrink-0" aria-hidden="true" />
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
