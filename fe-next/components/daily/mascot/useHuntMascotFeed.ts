import { useEffect, useRef, useState } from 'react';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import type { FeedbackType } from '../survival/types';
import { huntFeedbackEvent, nextHuntStreak } from './dailyMascotEvents';

interface HuntFeed {
  feedbackSeq: number;
  feedbackType: FeedbackType | null;
  feedbackWord: string | null;
}

/** Sends each new Word Hunt verdict to the mascot bus; returns the found-in-a-row streak. */
export function useHuntMascotFeed({ feedbackSeq, feedbackType, feedbackWord }: HuntFeed): number {
  const lastSeq = useRef(feedbackSeq);
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (feedbackSeq === lastSeq.current) return;
    lastSeq.current = feedbackSeq;
    setStreak((s) => nextHuntStreak(s, feedbackType));
    const event = huntFeedbackEvent(feedbackType, feedbackWord);
    if (event) emitMascotEvent(event);
  }, [feedbackSeq, feedbackType, feedbackWord]);
  return streak;
}
