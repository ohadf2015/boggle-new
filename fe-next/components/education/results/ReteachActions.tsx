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

import Link from 'next/link';
import {
  Check,
  ClipboardList,
  GraduationCap,
  Play,
  Printer,
  QrCode,
  Share2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReteachLinks } from './useReteachLinks';

const ACTION =
  'flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm text-center ' +
  'text-neo-black border-neo border-neo-black rounded-neo shadow-hard-sm ' +
  'hover:shadow-hard hover:-translate-y-0.5 transition-all';

export interface ReteachActionsProps {
  links: ReteachLinks;
  onReteach?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ReteachActions({ links, onReteach, t }: ReteachActionsProps) {
  return (
    <div className="mt-3">
      {onReteach && (
        <button
          type="button"
          data-testid="play-reteach-round"
          onClick={onReteach}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3.5 font-neo-display font-bold text-base',
            'bg-neo-pink text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
          )}
        >
          <Play className="w-5 h-5" aria-hidden />
          {t('education.results.playReteachRound')}
        </button>
      )}

      <details className="group mt-3 rounded-neo border-neo border-neo-black bg-neo-navy overflow-hidden">
        <summary
          data-testid="reteach-more-actions"
          className={cn(
            'flex items-center justify-between gap-2 cursor-pointer list-none px-4 py-3',
            'font-neo-display font-bold text-sm text-neo-white bg-neo-navy-elevated',
            'hover:bg-neo-purple/30 transition-colors'
          )}
        >
          {t('education.results.moreWaysToReteach')}
          <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
          {links.unpluggedReteachHref && (
            <Link
              href={links.unpluggedReteachHref}
              data-testid="start-unplugged-reteach-live"
              className={cn(ACTION, 'bg-neo-pink/90')}
            >
              <Play className="w-4 h-4 shrink-0" aria-hidden />
              {t('education.results.startUnpluggedReteachLive')}
            </Link>
          )}
          {links.missGapAsyncAssignHref && (
            <Link
              href={links.missGapAsyncAssignHref}
              data-testid="assign-miss-gap-async-homework"
              className={cn(ACTION, 'bg-neo-pink')}
            >
              <ClipboardList className="w-4 h-4 shrink-0" aria-hidden />
              {t('education.results.assignMissGapAsyncHomework')}
            </Link>
          )}
          {links.googleClassroomReteachHref && (
            <a
              href={links.googleClassroomReteachHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="post-reteach-google-classroom"
              className={cn(ACTION, 'bg-neo-white')}
            >
              <GraduationCap className="w-4 h-4 shrink-0" aria-hidden />
              {t('education.results.postReteachGoogleClassroom')}
            </a>
          )}
          {links.googleClassroomAssignHref && (
            <a
              href={links.googleClassroomAssignHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="assign-practice-google-classroom"
              className={cn(ACTION, 'bg-neo-cyan')}
            >
              <GraduationCap className="w-4 h-4 shrink-0" aria-hidden />
              {t('education.results.assignPracticeGoogleClassroom')}
            </a>
          )}
          {links.googleClassroomUnpluggedAssignHref && (
            <a
              href={links.googleClassroomUnpluggedAssignHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="assign-unplugged-google-classroom"
              className={cn(ACTION, 'bg-neo-lime')}
            >
              <GraduationCap className="w-4 h-4 shrink-0" aria-hidden />
              {t('education.results.assignUnpluggedGoogleClassroom')}
            </a>
          )}
          <button
            type="button"
            data-testid="print-missed-words-practice-sheet"
            onClick={links.onPrintPracticeSheet}
            className={cn(ACTION, 'bg-neo-cream')}
          >
            <Printer className="w-4 h-4 shrink-0" aria-hidden />
            {t('education.results.printPracticeSheet')}
          </button>
          <button
            type="button"
            data-testid="print-unplugged-reteach-pack"
            onClick={links.onPrintUnpluggedPack}
            className={cn(ACTION, 'bg-neo-cyan')}
          >
            <QrCode className="w-4 h-4 shrink-0" aria-hidden />
            {t('education.results.printUnpluggedReteachPack')}
          </button>
          <button
            type="button"
            data-testid="share-miss-gap-practice"
            onClick={links.onShareMissGapPractice}
            className={cn(ACTION, 'bg-neo-white')}
          >
            {links.missGapShareState === 'idle' ? (
              <>
                <Share2 className="w-4 h-4 shrink-0" aria-hidden />
                {t('education.results.shareMissGapPractice')}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 shrink-0" aria-hidden />
                {t('education.results.shareMissGapPracticeCopied')}
              </>
            )}
          </button>
        </div>
      </details>
    </div>
  );
}

export default ReteachActions;
