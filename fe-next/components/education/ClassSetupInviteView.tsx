'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { ChevronDown, MonitorPlay, UsersRound } from 'lucide-react';
import { EduMascot } from '@/components/education/EduMascot';
import { cn } from '@/lib/utils';
import { RosterSeats } from '@/components/teacher/hq/RosterSeats';
import type { RosterStudent } from '@/components/teacher/hq/rosterModel';
import { NB_ADVANCED, NB_BLOCK, NB_LINK as QUIET_LINK, NB_PANEL_POP, NB_PRIMARY as PRIMARY_BUTTON, NB_SECONDARY as SECONDARY_BUTTON, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { CelebrationBurst } from '@/components/education/motion';
import { ClassSetupInviteCode, type InviteChannel } from './ClassSetupInviteCode';
import { ClassReadyGuide } from './ClassReadyGuide';

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
  homeHref: string;
  reduced: boolean;
  onShare: (channel: InviteChannel, payload: { url: string; text: string }) => void;
  onOpenProjector: () => void;
  /** Quiet rehearse-with-bots door; shown only before anyone joins. */
  rehearse?: ReactNode;
  /** The same private practice as a big button, offered on the first question. */
  tryAsStudent?: ReactNode;
  words?: ReactNode;
  /** The word list needs the teacher (a paste error): its fold opens by itself. */
  wordsAttention?: boolean;
  /** When given, this is the hero in the bottom slot once a student is in, and the projector stays secondary. */
  play?: ReactNode;
  /** The next-lesson reminder for a teacher preparing alone. */
  plan?: ReactNode;
  onTogetherChoice?: (choice: TogetherChoice) => void;
  footer?: ReactNode;
  t: T;
}

export type TogetherChoice = 'now' | 'later';

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
export function ClassSetupInviteView({ classroom, roster, joinUrl, displayHost, homeHref, reduced, onShare, onOpenProjector, rehearse, tryAsStudent, words, wordsAttention = false, play, plan, onTogetherChoice, footer, t }: ClassSetupInviteViewProps) {
  const joined = roster.loading ? null : roster.students.length;
  const studentsIn = (joined ?? 0) > 0;
  const [startAnyway, setStartAnyway] = useState(false);
  const seats = useRosterSeats();
  const newest = roster.arrivals[roster.arrivals.length - 1];
  const [together, setTogether] = useState<TogetherChoice | null>(null);
  const chooseTogether = (choice: TogetherChoice) => {
    setTogether(choice);
    onTogetherChoice?.(choice);
  };
  const asking = !!plan && !studentsIn && together === null;
  const planning = !!plan && together === 'later';
  const actionsHidden = planning && !studentsIn;
  const showPlay = !!play && (studentsIn || startAnyway);
  const waiting = !!play && !showPlay;
  const projectorLeads = !showPlay;
  const focused = (asking || planning) && !studentsIn;
  const [wordsOpen, setWordsOpen] = useState(false);
  const wordsShown = wordsOpen || wordsAttention;

  const projector = (
    <button
      type="button"
      data-testid="setup-projector"
      data-hero={projectorLeads ? 'true' : 'false'}
      onClick={onOpenProjector}
      className={cn(projectorLeads ? PRIMARY_BUTTON : SECONDARY_BUTTON, 'w-full', projectorLeads && 'min-h-[72px] text-2xl', showPlay && 'max-sm:hidden')}
    >
      <MonitorPlay className={projectorLeads ? 'size-6' : 'size-5'} aria-hidden="true" />
      {t('eduShell.setup.showProjector')}
    </button>
  );

  const hero = showPlay
    ? <m.div key="play" {...(reduced ? { initial: false } : { initial: { scale: 0.92, y: 8 }, animate: { scale: 1, y: 0 }, transition: { type: 'spring', stiffness: 420, damping: 24 } })}>{play}</m.div>
    : projector;

  return (
    <section
      data-testid="setup-step-ready"
      aria-labelledby="setup-ready-title"
      className={cn("mx-auto grid w-full max-w-xl grid-cols-1 gap-4 px-3 pt-3 sm:px-4 sm:pt-6 lg:min-h-[calc(100dvh-7rem)] lg:max-w-6xl lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:content-center lg:gap-x-8 lg:pb-6", focused && 'lg:min-h-0 lg:max-w-2xl lg:grid-cols-1')}
    >
      <header className="flex items-center gap-3 lg:col-span-2">
        <EduMascot moment="success" size={96} className="size-16 shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))] sm:size-24" />
        <div className="min-w-0">
          <h1 id="setup-ready-title" tabIndex={-1} style={{ outline: 'none' }} className="font-neo-display text-3xl font-black leading-tight text-neo-cream sm:text-5xl">
            {t('eduShell.setup.readyTitle')}
          </h1>
          <p dir="auto" className={cn(NB_STICKER, NB_BLOCK.yellow, 'mt-1.5 max-w-full -rotate-2 truncate px-3 py-1 text-sm sm:text-base')}>
            {classroom.name}
          </p>
        </div>
      </header>

      {focused ? null : <ClassSetupInviteCode code={classroom.join_code} className={classroom.name} joinUrl={joinUrl} displayHost={displayHost} onShare={onShare} t={t} />}

      <div className="flex min-w-0 flex-col gap-3">
        {focused ? null : <div data-testid="invite-roster" className={cn(NB_PANEL_POP.pink, 'relative flex flex-col gap-2 p-3 sm:gap-3 sm:p-4', play && 'max-sm:hidden')}>
          <p data-testid="setup-joined-count" aria-live="polite" className="inline-flex items-center gap-2 font-neo-display text-lg font-bold text-neo-cream">
            <UsersRound className={cn('size-5 shrink-0', studentsIn ? 'text-neo-lime' : 'text-neo-cream/70')} aria-hidden="true" />
            {joinedText(joined, t)}
          </p>
          {joined === 0 ? null : <RosterSeats students={roster.students} arrivals={roster.arrivals} seats={seats} size={40} reduced={reduced} showNames className="min-h-[56px]" />}
          {newest && !reduced ? <CelebrationBurst playing burstKey={newest} variant="sparkle" /> : null}
          <p className="font-neo-body text-sm text-neo-cream/75">{t('eduShell.setup.noAccount')}</p>
        </div>}

        {focused || !words ? null : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              data-testid="setup-words-toggle"
              aria-expanded={wordsShown}
              aria-controls="setup-words-body"
              onClick={() => setWordsOpen((open) => !open)}
              className={NB_ADVANCED}
            >
              {t('eduShell.setup.words.title')}
              <ChevronDown className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', wordsShown && 'rotate-180')} aria-hidden="true" />
            </button>
            {/* Kept mounted while folded: Play reads and focuses its paste box. */}
            <div id="setup-words-body" data-testid="setup-words-body" className={cn(!wordsShown && 'hidden')}>
              {words}
            </div>
          </div>
        )}

        {asking || planning ? (
          <ClassReadyGuide
            stage={asking ? 'ask' : 'plan'}
            ready={joined !== null}
            reduced={reduced}
            tryAsStudent={tryAsStudent}
            plan={plan}
            onWithStudents={() => chooseTogether('now')}
            onAlone={() => chooseTogether('later')}
            t={t}
          />
        ) : null}

        {asking || actionsHidden ? null : <div
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
          {waiting ? <p data-testid="setup-waiting-note" className="font-neo-body text-sm font-semibold text-neo-cream/85">{t('eduShell.setup.guide.waitingBody')}</p> : null}
          {showPlay ? projector : null}
          <div data-testid="setup-hero-slot">{hero}</div>
          {waiting ? (
            <button type="button" data-testid="setup-start-anyway" onClick={() => setStartAnyway(true)} className={cn(QUIET_LINK, 'self-center')}>
              {t('eduShell.setup.guide.startAnyway')}
            </button>
          ) : null}
        </div>}
      </div>

      {asking ? null : (
        <div data-testid="setup-quiet-links" className="flex flex-wrap items-center justify-center gap-2 lg:col-span-2">
          {studentsIn ? null : rehearse}
          {actionsHidden ? (
            <button type="button" data-testid="setup-together-back" onClick={() => chooseTogether('now')} className={QUIET_LINK}>
              {t('eduShell.setup.guide.back')}
            </button>
          ) : null}
          {plan && !studentsIn && together === 'now' ? (
            <button type="button" data-testid="setup-together-alone-link" onClick={() => chooseTogether('later')} className={QUIET_LINK}>
              {t('eduShell.setup.guide.alone')}
            </button>
          ) : null}
          {showPlay ? (
            <button type="button" data-testid="setup-projector-quiet" onClick={onOpenProjector} className={cn(QUIET_LINK, 'sm:hidden')}>
              <MonitorPlay className="size-4" aria-hidden="true" />
              {t('eduShell.setup.showProjector')}
            </button>
          ) : null}
          <Link href={homeHref} className={QUIET_LINK}>
            {t('eduShell.setup.backHome')}
          </Link>
        </div>
      )}

      {asking || planning ? null : footer}
    </section>
  );
}

export default ClassSetupInviteView;
