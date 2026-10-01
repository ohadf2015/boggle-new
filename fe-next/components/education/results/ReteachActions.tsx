/**
 * What the teacher does next about the words the class missed.
 *
 * The old card stacked eight identical full-width buttons and made the teacher
 * read all of them to find the one that matters. Here the reteach round is the
 * button; the seven ways to send the same words home live behind one disclosure.
 *
 * The disclosure is a native <details>, so every action stays in the DOM and
 * keyboard-reachable whether it is open or shut — a collapsed action a teacher
 * cannot tab to is a removed action.
 */

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Check,
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  MonitorPlay,
  Play,
  Printer,
  QrCode,
  Share2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReteachLinks } from './useReteachLinks';

const ACTION =
  'flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm text-center ' +
  'text-neo-black border-[3px] border-neo-black rounded-neo shadow-hard-sm ' +
  'hover:shadow-hard hover:-translate-y-0.5 transition-all';

export interface ReteachActionsProps {
  links: ReteachLinks;
  onReteach?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * `stack` (default, the phone card): the pink reteach round is its own
   * button and the rest fold below it. `more` (the projector wall): Play again
   * is the wall's ONE loud action, so the reteach round folds in too, behind a
   * single quiet "More" control whose panel opens upward over the recap.
   */
  variant?: 'stack' | 'more';
}

export function ReteachActions({ links, onReteach, t, variant = 'stack' }: ReteachActionsProps) {
  if (variant === 'more') {
    return (
      // `static`, not `relative`: the panel anchors to the ROW that holds
      // "More" (the caller makes that row `relative`), never to this small
      // button. Anchored to the button, a 40rem panel hung off the right edge
      // of a 1024–1366px wall and took the reteach round with it.
      <details data-testid="reteach-more" className="group static">
        <summary
          data-testid="reteach-more-actions"
          className={cn(
            'flex cursor-pointer list-none items-center gap-2 rounded-neo px-4 py-2 [&::-webkit-details-marker]:hidden',
            'border-[3px] border-neo-cream bg-neo-navy-elevated text-neo-cream shadow-hard-sm',
            'font-neo-display text-base font-black uppercase tracking-wide lg:text-xl min-[2200px]:px-6 min-[2200px]:py-3 min-[2200px]:text-3xl',
            'hover:bg-neo-purple/30 transition-colors'
          )}
        >
          <MoreHorizontal className="size-5 shrink-0 lg:size-6 min-[2200px]:size-9" aria-hidden />
          {t('common.more')}
          <ChevronUp className="size-4 shrink-0 transition-transform group-open:rotate-180 lg:size-5" aria-hidden />
        </summary>
        <div
          data-testid="reteach-more-panel"
          className="absolute inset-x-0 bottom-full z-30 mb-2 max-h-[min(60dvh,34rem)] overflow-y-auto overscroll-contain rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy p-3 shadow-hard-lg"
        >
          <p className="mb-3 font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream lg:text-base">
            {t('education.results.moreWaysToReteach')}
          </p>
          <ReteachOptionGrid
            links={links}
            t={t}
            reteachSlot={
              onReteach && (
                <button
                  type="button"
                  data-testid="play-reteach-round"
                  onClick={onReteach}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 font-neo-display font-bold text-base',
                    'bg-neo-pink text-neo-black border-[3px] border-neo-black rounded-neo',
                    'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
                  )}
                >
                  <Play className="w-5 h-5" aria-hidden />
                  {t('education.results.playReteachRound')}
                </button>
              )
            }
          />
        </div>
      </details>
    );
  }

  return (
    <div className="mt-3">
      {onReteach && (
        <button
          type="button"
          data-testid="play-reteach-round"
          onClick={onReteach}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3.5 font-neo-display font-bold text-base',
            'bg-neo-pink text-neo-black border-[3px] border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
          )}
        >
          <Play className="w-5 h-5" aria-hidden />
          {t('education.results.playReteachRound')}
        </button>
      )}

      <details className="group mt-3 rounded-neo border-[3px] border-neo-cream bg-neo-navy overflow-hidden">
        <summary
          data-testid="reteach-more-actions"
          className={cn(
            'flex items-center justify-between gap-2 cursor-pointer list-none px-4 py-3',
            // A 2px cream edge, not navy-on-navy: a disclosure is a control and
            // has to have a visible edge on a dark card (design addendum —
            // fill OR border must clear 3:1 against what surrounds it).
            'font-neo-display font-bold text-sm text-neo-white bg-neo-navy-elevated',
            'border-2 border-neo-cream',
            'hover:bg-neo-purple/30 transition-colors'
          )}
        >
          {t('education.results.moreWaysToReteach')}
          <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <ReteachOptionGrid links={links} t={t} className="p-3" />
      </details>
    </div>
  );
}

const ROW =
  'flex w-full items-center gap-2.5 rounded-neo border-[2px] border-neo-cream/70 bg-neo-navy-elevated px-3 py-2 ' +
  'text-start font-neo-body text-sm font-bold text-neo-cream transition-colors hover:border-neo-cream hover:bg-neo-navy-light';

const ICON = 'grid size-7 shrink-0 place-items-center rounded-md border-2 border-neo-black text-neo-black [&>svg]:size-4';

function RowContent({ icon, tone, label }: { icon: ReactNode; tone: string; label: string }) {
  return (
    <>
      <span aria-hidden className={cn(ICON, tone)}>{icon}</span>
      <span className="min-w-0 flex-1 leading-tight">{label}</span>
    </>
  );
}

function Group({ testId, title, children }: { testId: string; title: string; children: ReactNode }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-1.5">
      <h3 className="font-neo-display text-xs font-black uppercase tracking-widest text-neo-yellow lg:text-sm">{title}</h3>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ReteachOptionGrid({
  links,
  t,
  className,
  reteachSlot,
}: Pick<ReteachActionsProps, 'links' | 't'> & { className?: string; reteachSlot?: ReactNode }) {
  const googleLinks = [
    { href: links.googleClassroomReteachHref, testId: 'post-reteach-google-classroom', key: 'education.results.postReteachGoogleClassroom' },
    { href: links.googleClassroomAssignHref, testId: 'assign-practice-google-classroom', key: 'education.results.assignPracticeGoogleClassroom' },
    { href: links.googleClassroomLiveAssignHref, testId: 'assign-miss-gap-live-google-classroom', key: 'education.results.assignMissGapLiveGoogleClassroom' },
    { href: links.googleClassroomUnpluggedAssignHref, testId: 'assign-unplugged-google-classroom', key: 'education.results.assignUnpluggedGoogleClassroom' },
  ].filter((g): g is { href: string; testId: string; key: string } => !!g.href);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Group testId="reteach-group-play" title={t('eduLive.reteach.playNow')}>
        {reteachSlot && <div className="sm:col-span-2">{reteachSlot}</div>}
        {links.canLaunchMissGapQuestionPack && (
          <button
            type="button"
            data-testid="launch-miss-gap-question-pack-live"
            onClick={links.onLaunchMissGapQuestionPack}
            className={cn(ACTION, 'bg-neo-lime sm:col-span-2')}
          >
            <ListChecks className="w-4 h-4 shrink-0" aria-hidden />
            {t('education.results.launchMissGapQuestionPackLive')}
          </button>
        )}
        {links.unpluggedReteachHref && (
          <Link href={links.unpluggedReteachHref} data-testid="start-unplugged-reteach-live" className={ROW}>
            <RowContent icon={<Play />} tone="bg-neo-pink" label={t('education.results.startUnpluggedReteachLive')} />
          </Link>
        )}
        {links.classicUnpluggedHref && (
          <Link href={links.classicUnpluggedHref} data-testid="start-classic-unplugged" className={ROW}>
            <RowContent icon={<MonitorPlay />} tone="bg-neo-cyan" label={t('education.results.startClassicUnplugged')} />
          </Link>
        )}
        {links.teamTilesUnpluggedHref && (
          <Link href={links.teamTilesUnpluggedHref} data-testid="start-team-tiles-unplugged" className={ROW}>
            <RowContent icon={<LayoutGrid />} tone="bg-neo-yellow" label={t('education.results.startTeamTilesUnplugged')} />
          </Link>
        )}
      </Group>

      <Group testId="reteach-group-send" title={t('eduLive.reteach.sendHome')}>
        {links.missGapAsyncAssignHref && (
          <Link href={links.missGapAsyncAssignHref} data-testid="assign-miss-gap-async-homework" className={ROW}>
            <RowContent icon={<ClipboardList />} tone="bg-neo-pink" label={t('education.results.assignMissGapAsyncHomework')} />
          </Link>
        )}
        {googleLinks.length > 0 && (
          <details data-testid="reteach-google-classroom" className="group/gc rounded-neo">
            <summary className={cn(ROW, 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}>
              <RowContent icon={<GraduationCap />} tone="bg-neo-white" label={t('eduLive.reteach.googleClassroom')} />
              <ChevronDown className="size-4 shrink-0 transition-transform group-open/gc:rotate-180" aria-hidden />
            </summary>
            <div className="mt-1.5 flex flex-col gap-1.5 ps-3">
              {googleLinks.map((g) => (
                <a key={g.testId} href={g.href} target="_blank" rel="noopener noreferrer" data-testid={g.testId} className={ROW}>
                  <RowContent icon={<GraduationCap />} tone="bg-neo-cyan" label={t(g.key)} />
                </a>
              ))}
            </div>
          </details>
        )}
      </Group>

      <Group testId="reteach-group-print" title={t('eduLive.reteach.printShare')}>
        <button type="button" data-testid="print-missed-words-practice-sheet" onClick={links.onPrintPracticeSheet} className={ROW}>
          <RowContent icon={<Printer />} tone="bg-neo-cream" label={t('education.results.printPracticeSheet')} />
        </button>
        <button type="button" data-testid="print-unplugged-reteach-pack" onClick={links.onPrintUnpluggedPack} className={ROW}>
          <RowContent icon={<QrCode />} tone="bg-neo-cyan" label={t('education.results.printUnpluggedReteachPack')} />
        </button>
        <button type="button" data-testid="share-miss-gap-practice" onClick={links.onShareMissGapPractice} className={ROW}>
          <RowContent
            icon={links.missGapShareState === 'idle' ? <Share2 /> : <Check />}
            tone={links.missGapShareState === 'idle' ? 'bg-neo-white' : 'bg-neo-lime'}
            label={t(links.missGapShareState === 'idle' ? 'education.results.shareMissGapPractice' : 'education.results.shareMissGapPracticeCopied')}
          />
        </button>
      </Group>
    </div>
  );
}

export default ReteachActions;
