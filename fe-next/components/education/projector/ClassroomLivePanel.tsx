'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import { emptyLiveRoundWords, foldLiveWords, maskWord, type LiveWordItem } from './liveRoundWords';

interface FeedSocket {
  on(event: string, fn: (payload: unknown) => void): void;
  off(event: string, fn: (payload: unknown) => void): void;
}

export interface ClassroomLivePanelProps {
  socket: FeedSocket | null;
  /** Authoritative room total (sum of the server's per-player counts). */
  totalWords: number;
  lessonWords: readonly string[];
  hostUsername?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * The teacher's read on a live round: how busy the room is, the longest word so
 * far as a masked teaser, and how many lesson words have surfaced.
 */
export const ClassroomLivePanel = memo<ClassroomLivePanelProps>(function ClassroomLivePanel({
  socket,
  totalWords,
  lessonWords,
  hostUsername,
  t,
}) {
  const reduceMotion = useReducedMotion();
  const lessonSet = useMemo(() => new Set(lessonWords.map((w) => w.toLowerCase())), [lessonWords]);
  const [state, setState] = useState(emptyLiveRoundWords);

  useEffect(() => {
    if (!socket) return;
    const onBatch = (payload: unknown) => {
      const words = (payload as { words?: LiveWordItem[] } | null)?.words;
      if (!words?.length) return;
      setState((prev) => foldLiveWords(prev, words, lessonSet, hostUsername));
    };
    socket.on('playerFoundWordBatch', onBatch);
    return () => socket.off('playerFoundWordBatch', onBatch);
  }, [socket, lessonSet, hostUsername]);

  const shownTotal = useCountUp({ target: totalWords, duration: 500, immediate: !!reduceMotion });
  const tiles = state.best ? maskWord(state.best.word) : [];
  const lessonTotal = lessonSet.size;
  const lessonFound = state.lessonFound.length;
  const lessonPct = lessonTotal > 0 ? Math.round((lessonFound / lessonTotal) * 100) : 0;

  return (
    <section
      data-testid="classroom-live-panel"
      aria-label={t('eduLive.live.panelTitle')}
      className="flex h-full min-h-0 flex-col gap-[clamp(8px,1.6vh,20px)] overflow-hidden rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-elevated p-[clamp(10px,2vh,28px)] text-neo-cream shadow-hard-lg"
    >
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-2 max-md:flex-col max-md:items-start max-md:gap-1">
          <m.span
            key={totalWords}
            data-testid="live-total-words"
            initial={reduceMotion ? false : { scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 16 }}
            className="inline-block font-neo-display font-black leading-none tabular-nums text-neo-lime text-[44px] md:text-[clamp(36px,8vh,110px)]"
          >
            {shownTotal}
          </m.span>
          <span className="font-neo-display font-black uppercase tracking-wide text-[13px] md:text-[clamp(13px,2.2vh,30px)]">
            {t('eduLive.live.wordsFound')}
          </span>
        </div>

        {lessonTotal > 0 && (
          <div data-testid="live-lesson-meter" className="flex min-w-[9rem] flex-1 flex-col gap-1 md:min-w-[min(100%,14rem)] sm:max-w-[24rem]">
            <span className="flex items-center gap-2 font-neo-display font-black uppercase tracking-wide text-[clamp(12px,1.8vh,24px)]">
              <BookOpen className="size-[1.1em] shrink-0 text-neo-cyan" aria-hidden />
              {t('eduLive.live.lessonFound', { found: lessonFound, total: lessonTotal })}
            </span>
            <span className="relative h-[clamp(10px,1.6vh,20px)] overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy">
              <span
                className="absolute inset-y-0 start-0 rounded-full bg-neo-cyan transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${lessonPct}%` }}
              />
            </span>
          </div>
        )}
      </div>

      <div
        data-testid="live-word-of-round"
        data-empty={state.best ? 'false' : 'true'}
        // A phone has room for the count and the meter; the teaser is a projector moment.
        className="hidden min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(6px,1.4vh,18px)] rounded-neo border-[3px] border-dashed border-neo-cream/50 bg-neo-navy px-3 py-2 text-center md:flex"
      >
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-0.5 font-neo-display font-black uppercase tracking-widest text-neo-black text-[clamp(11px,1.7vh,22px)] shadow-hard-sm">
          <Sparkles className="size-[1em] shrink-0" aria-hidden />
          {t('eduLive.live.wordOfRound')}
        </span>

        {state.best ? (
          <m.div
            key={state.best.word}
            initial={reduceMotion ? false : { scale: 0.6, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 14 }}
            className="flex flex-col items-center gap-[clamp(4px,1vh,12px)]"
          >
            <span dir="auto" className="flex max-w-full flex-wrap justify-center gap-[clamp(3px,0.6vw,10px)]">
              {tiles.map((letter, i) => (
                <span
                  key={i}
                  data-testid="live-word-tile"
                  className={cn(
                    'grid place-items-center rounded-md border-[3px] border-neo-black font-neo-display font-black leading-none shadow-[3px_3px_0_#000]',
                    'size-[clamp(26px,6vh,76px)] text-[clamp(16px,4vh,52px)]',
                    letter ? 'bg-neo-cream text-neo-black' : 'bg-neo-purple/80 text-neo-cream'
                  )}
                >
                  {letter || '?'}
                </span>
              ))}
            </span>
            <span className="font-neo-body font-bold text-[clamp(12px,2vh,26px)]">
              {t('eduLive.live.bestWordBy', { count: tiles.length, name: state.best.username })}
            </span>
          </m.div>
        ) : (
          <p className="font-neo-body font-bold text-neo-cream/85 text-[clamp(12px,2vh,26px)]">
            {t('eduLive.live.wordOfRoundEmpty')}
          </p>
        )}
      </div>
    </section>
  );
});

export default ClassroomLivePanel;
