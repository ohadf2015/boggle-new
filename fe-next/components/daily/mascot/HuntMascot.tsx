'use client';

import { GameMascotReactions } from '@/components/mascot/GameMascotReactions';
import type { Language } from '@/types';
import type { FeedbackType } from '../survival/types';
import { useHuntMascotFeed } from './useHuntMascotFeed';

interface HuntMascotProps {
  feed: { feedbackSeq: number; feedbackType: FeedbackType | null; feedbackWord: string | null };
  language: Language;
  remainingTime: number | null;
}

// Bottom-end, over the found-words strip: the header, clue boxes, life bar and board fill the top.
const HUNT_SLOT = 'bottom-[calc(max(0.5rem,env(safe-area-inset-bottom,0px))+0.25rem)] end-2';
// Gags slide in along the same bottom strip on phones; the desktop shell has no strip, so they keep the top row.
const HUNT_STAGE = 'bottom-0 h-[6.5rem] shell:bottom-auto shell:top-2 shell:h-32';

export function HuntMascot({ feed, language, remainingTime }: HuntMascotProps) {
  const streak = useHuntMascotFeed(feed);
  return (
    <GameMascotReactions
      mode="word-hunt"
      comboLevel={streak}
      personality="full"
      language={language}
      remainingTime={remainingTime}
      slotClassName={HUNT_SLOT}
      stageClassName={HUNT_STAGE}
    />
  );
}
