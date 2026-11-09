'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { MonitorPlay, Play, UsersRound } from 'lucide-react';
import { EduMascot } from '@/components/education/EduMascot';
import { cn } from '@/lib/utils';
import { RosterSeats } from '@/components/teacher/hq/RosterSeats';
import type { RosterStudent } from '@/components/teacher/hq/rosterModel';
import { NB_BLOCK, NB_LINK as QUIET_LINK, NB_PANEL_POP, NB_PRIMARY as PRIMARY_BUTTON, NB_SECONDARY as SECONDARY_BUTTON, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { CelebrationBurst } from '@/components/education/motion';
import { ClassSetupInviteCode, type InviteChannel } from './ClassSetupInviteCode';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface InviteRoster {
  students: RosterStudent[];
  arrivals: string[];
  loading: boolean;
}

export interface ClassSetupInviteViewProps {
  classroom: { name: string; join_code: string };
  roster: InviteRoster;
  joinUrl: string;
  displayHost: string;
  startHref: string;
  homeHref: string;
  reduced: boolean;
  onShare: (channel: InviteChannel, payload: { url: string; text: string }) => void;
  onOpenProjector: () => void;
  onStart?: () => void;
  /** Rehearse-with-bots door; shown only before anyone joins. */
  rehearse?: ReactNode;
  words?: ReactNode;
  /** When given, this is the hero in the bottom slot whoever has joined, and the projector stays secondary. */
  play?: ReactNode;
  /** "Not with your class right now?" calendar card; shown only while nobody has joined. */
  plan?: ReactNode;
  footer?: ReactNode;
  t: T;
}

const WIDE_ROSTER_QUERY = '(min-width: 1280px)';

function subscribeWide(onChange: () => void): () => void {
  const mq = window.matchMedia(WIDE_ROSTER_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** Seven named seats fit one row of the desktop panel; phones keep five so the row never wraps. Server and first paint use five. */
function useRosterSeats(): number {
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_ROSTER_QUERY).matches, () => false);
  return wide ? 7 : 5;
}

function joinedText(joined: number | null, t: T): string {
  if (joined === null) return '…';
  if (joined === 0) return t('eduShell.setup.joinedNone');
  return joined === 1 ? t('eduShell.setup.joinedOne') : t('eduShell.setup.joinedMany', { count: joined });
}

/** Code, roster and actions for the invite step; the hero action always lands in the bottom slot so the thumb never hunts for it. */
export function ClassSetupInviteView({ classroom, roster, joinUrl, displayHost, startHref, homeHref, reduced, onShare, onOpenProjector, onStart, rehearse, words, play, plan, footer, t }: ClassSetupInviteViewProps) {
  const joined = roster.loading ? null : roster.students.length;
  const studentsIn = (joined ?? 0) > 0;
  const projectorLeads = !play && !studentsIn;
  const seats = useRosterSeats();
  const newest = roster.arrivals[roster.arrivals.length - 1];

  const projector = (
    <button
      type="button"
      data-testid="setup-projector"
      data-hero={projectorLeads ? 'true' : 'false'}
      onClick={onOpenProjector}
      className={cn(projectorLeads ? PRIMARY_BUTTON : SECONDARY_BUTTON, 'w-full', projectorLeads && 'min-h-[60px] text-2xl', play && 'max-sm:hidden')}
    >
      <MonitorPlay className={projectorLeads ? 'size-6' : 'size-5'} aria-hidden="true" />
      {t('eduShell.setup.showProjector')}
    </button>
  );
  const start = (
    <Link
      href={startHref}
      data-testid="setup-start-game"
      data-hero={studentsIn ? 'true' : 'false'}
      onClick={onStart}
      className={cn(studentsIn ? PRIMARY_BUTTON : SECONDARY_BUTTON, 'w-full', studentsIn && 'min-h-[60px] text-2xl')}
    >
      <Play className={cn(studentsIn ? 'size-6' : 'size-5', 'fill-current')} aria-hidden="true" />
      {t(studentsIn ? 'eduShell.setup.startQuick' : 'eduShell.setup.firstRound.start')}
    </Link>
  );

  return (
    <section
      data-testid="setup-step-ready"
      aria-labelledby="setup-ready-title"
      className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 px-3 pt-3 sm:gap-4 sm:px-4 sm:pt-5 lg:min-h-[calc(100dvh-7rem)] lg:max-w-6xl lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:content-center lg:gap-x-8 lg:pb-6"
    >
      <header className="flex items-center gap-3 lg:col-span-2">
        <EduMascot moment="success" size={96} className={cn(words ? 'size-12' : 'size-16', 'shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))] sm:size-24')} />
        <div className="min-w-0">
          <h1 id="setup-ready-title" tabIndex={-1} style={{ outline: 'none' }} className={cn(words ? 'text-2xl' : 'text-3xl', 'font-neo-display font-black leading-tight text-neo-cream sm:text-5xl')}>
            {t('eduShell.setup.readyTitle')}
          </h1>
          <p dir="auto" className={cn(NB_STICKER, NB_BLOCK.yellow, 'mt-1.5 max-w-full -rotate-2 truncate px-3 py-1 text-sm sm:text-base')}>
            {classroom.name}
          </p>
        </div>
      </header>

      <ClassSetupInviteCode code={classroom.join_code} className={classroom.name} joinUrl={joinUrl} displayHost={displayHost} onShare={onShare} t={t} />

      <div className="flex min-w-0 flex-col gap-3">
        {words}
        <div data-testid="invite-roster" className={cn(NB_PANEL_POP.pink, 'relative flex flex-col gap-2 p-3 sm:gap-3 sm:p-4', !words && 'lg:flex-1 lg:justify-between lg:p-5', play && 'max-sm:hidden')}>
          <p data-testid="setup-joined-count" aria-live="polite" className="inline-flex items-center gap-2 font-neo-display text-lg font-bold text-neo-cream">
            <UsersRound className={cn('size-5 shrink-0', studentsIn ? 'text-neo-lime' : 'text-neo-cream/70')} aria-hidden="true" />
            {joinedText(joined, t)}
          </p>
          {words && joined === 0 ? null : <RosterSeats students={roster.students} arrivals={roster.arrivals} seats={seats} size={40} reduced={reduced} showNames className="min-h-[56px]" />}
          {newest && !reduced ? <CelebrationBurst playing burstKey={newest} variant="sparkle" /> : null}
          <p className="font-neo-body text-sm text-neo-cream/75">{t('eduShell.setup.noAccount')}</p>
        </div>

        <div
          data-testid="setup-actions"
          className="sticky bottom-0 z-10 -mx-3 flex flex-col gap-3 border-t-[3px] border-neo-cream/50 bg-neo-navy px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:px-0"
        >
          {play ? (
            <p data-testid="setup-joined-line" className="flex min-w-0 flex-col font-neo-body text-sm font-bold text-neo-cream sm:hidden">
              <span className="inline-flex min-w-0 items-center gap-2">
                <UsersRound className={cn('size-4 shrink-0', studentsIn ? 'text-neo-lime' : 'text-neo-cream/70')} aria-hidden="true" />
                <span aria-live="polite" className="shrink-0">{joinedText(joined, t)}</span>
                {studentsIn ? (
                  <span dir="auto" className="truncate font-semibold text-neo-cream/80">
                    {roster.students.map((s) => s.name).join(', ')}
                  </span>
                ) : null}
              </span>
              {studentsIn ? null : <span className="ps-6 text-xs font-semibold text-neo-cream/70">{t('eduShell.setup.noAccount')}</span>}
            </p>
          ) : null}
          {play ? projector : studentsIn ? projector : start}
          <div data-testid="setup-hero-slot">{play ?? (studentsIn ? start : projector)}</div>
        </div>
      </div>

      {studentsIn || joined === null ? null : plan}

      <div data-testid="setup-quiet-links" className="flex flex-wrap items-center justify-center gap-2 lg:col-span-2">
        {studentsIn ? null : rehearse}
        {play ? (
          <button type="button" data-testid="setup-projector-quiet" onClick={onOpenProjector} className={cn(QUIET_LINK, 'sm:hidden')}>
            <MonitorPlay className="size-4" aria-hidden="true" />
            {t('eduShell.setup.showProjector')}
          </button>
        ) : null}
        <Link href={homeHref} className={QUIET_LINK}>
          {t('eduShell.setup.backHome')}
        </Link>
      </div>

      {footer}
    </section>
  );
}

export default ClassSetupInviteView;
