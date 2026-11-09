'use client';

/**
 * Practice run: the teacher's board, with their own student view beside it.
 * The student view is the real student page in a same-origin frame
 * (?practiceSeat=1): the teacher's account, but its own practice seat, never the
 * host seat and never a student (utils/practiceSeatStorage, backend/handlers/practiceSeat).
 * The round starts by itself once that seat joins, so the frame is the only thing to act on.
 *
 * Wide screens get the frame beside the board. Phones and portrait tablets get one
 * button that opens the student view in a new tab, and no frame at all: a hidden
 * frame still loads, joins the seat and starts the round where nobody can see it.
 */
import { useEffect, useState } from 'react';
import { PRACTICE_SEAT_RETRY_EVENT } from '@/host/hooks/useRehearseAutoStart';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Check, ExternalLink, MonitorSmartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { practiceSeatPath } from '@/lib/education/classroomLivePath';
import { NB_BLOCK, NB_PANEL, NB_SMALL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import type { Translate } from './eduLiveStyles';

interface PracticeRunPanelProps {
  gameCode: string;
  language: string;
  /** The practice seat is in the room. */
  joined: boolean;
  t: Translate;
}

export function PracticeRunPanel({ gameCode, language, joined, t }: PracticeRunPanelProps) {
  const [open, setOpen] = useState(true);
  const wide = useMediaQuery('(min-width: 1024px)');
  const [frameKey, setFrameKey] = useState(0);
  useEffect(() => {
    const reload = () => setFrameKey((n) => n + 1);
    window.addEventListener(PRACTICE_SEAT_RETRY_EVENT, reload);
    return () => window.removeEventListener(PRACTICE_SEAT_RETRY_EVENT, reload);
  }, []);
  const path = practiceSeatPath(language, gameCode);

  const status = (
    <span data-testid="practice-run-status" className={cn(NB_STICKER, joined ? NB_BLOCK.lime : NB_BLOCK.yellow)}>
      {joined ? <Check className="size-3.5" aria-hidden="true" /> : <span aria-hidden="true" className="size-2 rounded-full bg-neo-black motion-safe:animate-pulse" />}
      {t(joined ? 'eduLiveRoom.practice.joined' : 'eduLiveRoom.practice.joining')}
    </span>
  );

  const openTab = (
    <a href={path} target="_blank" rel="noopener" data-testid="practice-run-open-tab" className={cn(NB_SMALL, NB_BLOCK.cream)}>
      <ExternalLink className="size-4" aria-hidden="true" />
      {t('eduLiveRoom.practice.openTab')}
    </a>
  );

  if (!open) {
    return (
      <button
        type="button"
        data-testid="practice-run-show"
        onClick={() => setOpen(true)}
        className={cn(NB_SMALL, NB_BLOCK.cyan, 'fixed bottom-4 end-4 z-40')}
      >
        <MonitorSmartphone className="size-4" aria-hidden="true" />
        {t('eduLiveRoom.practice.show')}
      </button>
    );
  }

  const hide = (
    <button
      type="button"
      data-testid="practice-run-hide"
      onClick={() => setOpen(false)}
      aria-label={t('eduLiveRoom.practice.hide')}
      title={t('eduLiveRoom.practice.hide')}
      className={cn(NB_SMALL, NB_BLOCK.navy, 'min-w-11 px-0')}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );

  if (wide) {
    return (
      <aside
        data-testid="practice-run-panel"
        aria-labelledby="practice-run-title"
        className={cn(NB_PANEL, 'm-3 ms-0 flex w-[min(25rem,32vw)] shrink-0 flex-col gap-3 p-3')}
      >
        <div className="flex flex-col items-start gap-1.5">
          <h2 id="practice-run-title" className="min-w-0 font-neo-display text-xl font-black leading-tight">{t('eduLiveRoom.practice.title')}</h2>
          {status}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border-[5px] border-neo-cream bg-neo-navy shadow-hard-lg">
          <iframe
            key={frameKey}
            data-testid="practice-run-frame"
            src={path}
            title={t('eduLiveRoom.practice.frameTitle')}
            allow="clipboard-write"
            className="absolute inset-0 size-full border-0"
          />
        </div>
        {/* The close sits down here: the top corner belongs to the page's sound button. */}
        <div className="flex items-center justify-between gap-2">{openTab}{hide}</div>
      </aside>
    );
  }

  return (
    <section
      data-testid="practice-run-card"
      aria-labelledby="practice-run-card-title"
      className={cn(NB_PANEL, NB_BLOCK.navy, 'order-last m-3 mt-0 mb-[calc(var(--lc-teacher-bar-h,0px)+0.75rem)] flex shrink-0 flex-wrap items-center gap-3 p-3')}
    >
      <h2 id="practice-run-card-title" className="min-w-0 flex-1 font-neo-display text-lg font-black leading-tight">{t('eduLiveRoom.practice.title')}</h2>
      {status}
      <div className="flex w-full items-center gap-2">
        <div className="flex-1 [&>a]:w-full">{openTab}</div>
        {hide}
      </div>
    </section>
  );
}

export default PracticeRunPanel;
