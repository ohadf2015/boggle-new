'use client';

import { m, useReducedMotion } from 'framer-motion';
import { Swords } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface RivalAvatar {
  userId: string;
  customAvatar?: CustomAvatarConfig | null;
}

interface RivalCompareCardProps {
  rivalName: string;
  rivalEmoji: string;
  rivalScore: number;
  myScore: number;
  /** Real avatar for the rival — falls back to `rivalEmoji` when omitted. */
  rivalAvatar?: RivalAvatar;
  /** Real avatar for the current player — falls back to a 👤 glyph when omitted. */
  myAvatar?: RivalAvatar;
  t: (key: string) => string;
  /** Overrides the default header, e.g. to say what the two numbers measure. */
  header?: string;
}

/** My share of the combined score, 0-100; an empty race sits at the middle. */
export function rivalShare(myScore: number, rivalScore: number): number {
  const total = Math.max(0, myScore) + Math.max(0, rivalScore);
  if (total === 0) return 50;
  return Math.round((Math.max(0, myScore) / total) * 100);
}

/**
 * RivalCompareCard — you vs your rival, as a fight card.
 *
 * Was two grey boxes with "0" under each: nothing said who was ahead or what
 * to do about it. Now: a VS band, both fighters with big scores, a tug-of-war
 * bar that leans toward whoever is winning, and one line that says the gap to
 * close (or that a fresh week is up for grabs when both are on 0).
 */
export default function RivalCompareCard({
  rivalName,
  rivalEmoji,
  rivalScore,
  myScore,
  rivalAvatar,
  myAvatar,
  t,
  header,
}: RivalCompareCardProps) {
  const reduceMotion = useReducedMotion();
  const fresh = myScore === 0 && rivalScore === 0;
  const share = rivalShare(myScore, rivalScore);

  let outcomeMessage: string;
  let outcomeClass: string;
  if (fresh) {
    outcomeMessage = t('daily.rival.freshStart');
    outcomeClass = 'text-neo-yellow';
  } else if (myScore > rivalScore) {
    outcomeMessage = t('daily.rival.youWin').replace('{name}', rivalName);
    outcomeClass = 'text-neo-lime';
  } else if (myScore < rivalScore) {
    outcomeMessage = t('daily.rival.gapToPass')
      .replace('{points}', String(rivalScore - myScore + 1))
      .replace('{name}', rivalName);
    outcomeClass = 'text-neo-pink';
  } else {
    outcomeMessage = t('daily.rival.tie');
    outcomeClass = 'text-neo-cyan';
  }

  const fighter = (side: 'me' | 'them') => {
    const isMe = side === 'me';
    const avatar = isMe ? myAvatar : rivalAvatar;
    const leading = isMe ? myScore > rivalScore : rivalScore > myScore;
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <div
          className={`relative rounded-full border-[3px] border-neo-black p-0.5 shadow-hard-sm ${
            isMe ? 'bg-neo-lime' : 'bg-neo-pink'
          } ${leading && !reduceMotion ? 'animate-[qp-avatar-bob_1.8s_ease-in-out_infinite]' : ''}`}
        >
          {avatar ? (
            <Avatar userId={avatar.userId} customAvatar={avatar.customAvatar ?? undefined} size="lg" disableEffects />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center text-3xl leading-none">{isMe ? '👤' : rivalEmoji}</div>
          )}
          {leading && (
            <span aria-hidden="true" className="absolute inset-x-0 -top-4 text-center text-lg">
              👑
            </span>
          )}
        </div>
        <div className="max-w-full truncate text-xs font-bold text-neo-white/70">{isMe ? t('daily.rival.you') : rivalName}</div>
        <div
          data-testid={isMe ? 'rival-score-me' : 'rival-score-them'}
          className={`font-neo-display text-3xl font-black leading-none tabular-nums [text-shadow:2px_2px_0_black] ${
            isMe ? 'text-neo-lime' : 'text-neo-pink'
          }`}
          dir="ltr"
        >
          {isMe ? myScore : rivalScore}
        </div>
      </div>
    );
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="rival-compare-card"
      className="w-full overflow-hidden rounded-2xl border-[3px] border-neo-black bg-neo-navy shadow-hard"
    >
      <h3 className="flex items-center justify-center gap-1.5 border-b-[3px] border-neo-black bg-neo-pink px-3 py-1.5 font-neo-display text-xs font-black uppercase tracking-wider text-black">
        <Swords className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
        {header ?? t('daily.rival.header')}
      </h3>

      <div className="relative flex items-start gap-2 px-4 pt-5">
        {fighter('me')}
        <div className="mt-4 shrink-0 -rotate-6">
          <span
            aria-hidden="true"
            className={`flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-neo-black bg-neo-yellow font-neo-display text-base font-black text-black shadow-hard-sm ${
              reduceMotion ? '' : 'animate-[qp-value-pop_1.6s_ease-in-out_infinite]'
            }`}
          >
            VS
          </span>
        </div>
        {fighter('them')}
      </div>

      {/* Tug of war: my share fills from the start side. */}
      <div className="px-4 pt-4">
        <div
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={share}
          aria-label={outcomeMessage}
          data-testid="rival-tug"
          className="relative flex h-4 overflow-hidden rounded-full border-[3px] border-neo-black bg-neo-pink"
        >
          <m.div
            className="h-full bg-neo-lime"
            initial={{ width: '50%' }}
            animate={{ width: `${share}%` }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 14, delay: 0.3 }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-1 bg-neo-black"
            style={{ insetInlineStart: `calc(${share}% - 2px)` }}
          />
        </div>
      </div>

      <div className={`px-4 pb-4 pt-3 text-center font-neo-display text-sm font-black uppercase tracking-wide ${outcomeClass}`}>
        {outcomeMessage}
      </div>
    </m.div>
  );
}
