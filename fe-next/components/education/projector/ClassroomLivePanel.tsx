'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import type { Avatar as PlayerAvatar, Language } from '@/shared/types';
import { emptyLiveRoundWords, foldLiveWords, lessonWordSet, maskWord, type LiveWordItem } from './liveRoundWords';
import { LiveWordFeed } from './LiveWordFeed';
import { LessonRing } from './LessonRing';

interface FeedSocket {
  on(event: string, fn: (payload: unknown) => void): void;
  off(event: string, fn: (payload: unknown) => void): void;
}

export interface ClassroomLivePanelProps {
  socket: FeedSocket | null;
  /** Authoritative room total (sum of the server's per-player counts). */
  totalWords: number;
  lessonWords: readonly string[];
  /** The room's board language: lesson keys fold its alternate spellings. */
  language?: Language;
  hostUsername?: string;
  players?: readonly { username: string; avatar?: PlayerAvatar | null }[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** The teacher's read on a live round: how busy the room is, who is finding words right now, and the lesson words found. */
export const ClassroomLivePanel = memo<ClassroomLivePanelProps>(function ClassroomLivePanel({
  socket,
  totalWords,
  lessonWords,
  language = 'en',
  hostUsername,
  players,
  t,
}) {
  const reduceMotion = !!useReducedMotion();
  const lessonSet = useMemo(() => lessonWordSet(lessonWords, language), [lessonWords, language]);
  const avatars = useMemo(() => new Map((players ?? []).map((p) => [p.username, p.avatar])), [players]);
  const [state, setState] = useState(emptyLiveRoundWords);

  useEffect(() => {
    if (!socket) return;
    const onBatch = (payload: unknown) => {
      const words = (payload as { words?: LiveWordItem[] } | null)?.words;
      if (!words?.length) return;
      setState((prev) => foldLiveWords(prev, words, lessonSet, hostUsername, language));
    };
    socket.on('playerFoundWordBatch', onBatch);
    return () => socket.off('playerFoundWordBatch', onBatch);
  }, [socket, lessonSet, hostUsername, language]);

  const shownTotal = useCountUp({ target: totalWords, duration: 500, immediate: reduceMotion });
  const lessonTotal = lessonSet.size;

  return (
    <section
      data-testid="classroom-live-panel"
      aria-label={t('eduLive.live.panelTitle')}
      className="flex h-full min-h-0 flex-col gap-[clamp(8px,1.4cqh,18px)] overflow-hidden rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-elevated md:[container-type:size] p-[clamp(10px,1.8cqh,24px)] text-neo-cream shadow-hard-lg"
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2 max-md:flex-col max-md:items-start max-md:gap-1 md:flex-col md:items-start md:gap-0">
          <m.span
            key={totalWords}
            data-testid="live-total-words"
            initial={reduceMotion ? false : { scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 16 }}
            className="inline-block origin-[0%_80%] font-neo-display font-black leading-none tabular-nums text-neo-lime text-[44px] md:text-[clamp(36px,min(11cqh,24cqw),120px)]"
          >
            {shownTotal}
          </m.span>
          <span className="font-neo-display font-black uppercase tracking-wide text-[13px] md:text-[clamp(14px,min(2.8cqh,5.6cqw),30px)]">
            {t('eduLive.live.wordsFound')}
          </span>
        </div>
        {lessonTotal > 0 && <LessonRing found={state.lessonFound.length} total={lessonTotal} t={t} />}
      </div>

      {/* A phone has room for the count and the ring; the feed is a projector moment. */}
      <div className="hidden min-h-0 flex-1 flex-col gap-[clamp(6px,1.2cqh,14px)] md:flex">
        <LiveWordFeed entries={state.recent} avatars={avatars} reduceMotion={reduceMotion} t={t} />
        {state.best && <BestWord word={state.best.word} username={state.best.username} t={t} />}
      </div>
    </section>
  );
});

function BestWord({ word, username, t }: { word: string; username: string; t: ClassroomLivePanelProps['t'] }) {
  const tiles = maskWord(word);
  return (
    <div
      data-testid="live-word-of-round"
      className="flex shrink-0 flex-wrap items-center gap-x-[clamp(6px,1.6cqw,14px)] gap-y-1 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-[clamp(6px,2cqw,16px)] py-[clamp(4px,0.8cqh,10px)] text-neo-black shadow-hard-sm"
    >
      <span className="inline-flex items-center gap-1 font-neo-display font-black uppercase tracking-wide text-[clamp(13px,min(4.2cqw,2.6cqh),26px)]">
        <Sparkles className="size-[1em] shrink-0" aria-hidden />
        {t('eduLive.live.wordOfRound')}
      </span>
      <span dir="auto" className="flex gap-[2px]" aria-hidden>
        {tiles.map((letter, i) => (
          <span key={i} className="grid size-[clamp(16px,min(5.6cqw,3.4cqh),40px)] place-items-center rounded-[3px] border-2 border-neo-black bg-neo-cream font-neo-display font-black leading-none text-[clamp(11px,min(3.8cqw,2.4cqh),28px)]">
            {letter}
          </span>
        ))}
      </span>
      <span className="font-neo-body font-bold text-[clamp(13px,min(4.2cqw,2.6cqh),26px)]">
        {t('eduLive.live.bestWordBy', { count: tiles.length, name: username })}
      </span>
    </div>
  );
}

export default ClassroomLivePanel;
