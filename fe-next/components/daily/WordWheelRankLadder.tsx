import React from 'react';
import { m } from 'framer-motion';
import { ChevronUp, Crown } from 'lucide-react';
import Avatar from '@/components/Avatar';

export interface LadderRival {
  name: string;
  score: number;
  playerId?: string | null;
  customAvatar?: string | null;
  avatarImage?: string | null;
}

interface WordWheelRankLadderProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  score: number;
  rivals: LadderRival[];
}

export default function WordWheelRankLadder({ t, score, rivals }: WordWheelRankLadderProps) {
  const above = rivals.filter(r => r.score > score);
  const nextRival = above.reduce<LadderRival | null>(
    (best, r) => (best === null || r.score < best.score ? r : best),
    null,
  );
  const floor = rivals
    .filter(r => r.score <= score)
    .reduce((max, r) => Math.max(max, r.score), 0);

  if (!nextRival) {
    return (
      <div data-testid="next-rival-slot" className="w-full flex items-center justify-center h-[34px]">
        {rivals.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-neo-lime">
            <Crown className="w-3.5 h-3.5" aria-hidden />
            {t('wordWheel.climb.top')}
          </span>
        )}
      </div>
    );
  }

  const span = Math.max(1, nextRival.score - floor);
  const ratio = Math.min(1, Math.max(0, (score - floor) / span));
  const percent = Math.round(ratio * 100);

  return (
    <div data-testid="next-rival-slot" className="w-full max-w-md flex flex-col items-center gap-1.5">
      <div className="max-w-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neo-white whitespace-nowrap">
        <ChevronUp className="w-3.5 h-3.5 text-neo-lime shrink-0" aria-hidden />
        <Avatar
          pixelSize={20}
          userId={nextRival.playerId ?? nextRival.name}
          customAvatar={nextRival.customAvatar ?? undefined}
          avatarImage={nextRival.avatarImage ?? undefined}
          className="shrink-0 rounded-full"
        />
        <span className="truncate">
          {t('wordWheel.pointsToPass', { count: nextRival.score - score, name: nextRival.name })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="w-full h-2 rounded-full border-2 border-neo-black bg-neo-navy-light overflow-hidden"
      >
        <m.div
          className="h-full w-full origin-left rtl:origin-right bg-linear-to-r from-neo-lime to-neo-cyan"
          initial={false}
          animate={{ scaleX: ratio }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
