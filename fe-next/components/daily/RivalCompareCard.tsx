'use client';

import { m } from 'framer-motion';
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
}

/**
 * RivalCompareCard - Head-to-head comparison card
 * Shows rival vs receiver score with win/lose/tie outcome
 */
export default function RivalCompareCard({
  rivalName,
  rivalEmoji,
  rivalScore,
  myScore,
  rivalAvatar,
  myAvatar,
  t,
}: RivalCompareCardProps) {
  // Determine outcome
  let outcomeMessage: string;
  let outcomeClass: string;

  if (myScore > rivalScore) {
    outcomeMessage = t('daily.rival.youWin').replace('{name}', rivalName);
    outcomeClass = 'text-neo-lime';
  } else if (myScore < rivalScore) {
    outcomeMessage = t('daily.rival.youLose').replace('{name}', rivalName);
    outcomeClass = 'text-neo-pink';
  } else {
    outcomeMessage = t('daily.rival.tie');
    outcomeClass = 'text-neo-cyan';
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-6 p-4 bg-neo-navy border-3 border-neo-black rounded-xl shadow-hard"
    >
      {/* Header: "Challenge Comparison" or similar */}
      <h3 className="text-xs font-bold uppercase text-neo-white/70 mb-3 text-center">
        {t('daily.rival.header')}
      </h3>

      {/* Two-column score comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Rival column */}
        <div className="flex flex-col items-center gap-2 p-3 bg-neo-navy-light rounded-lg border-2 border-neo-black/20">
          {rivalAvatar ? (
            <Avatar userId={rivalAvatar.userId} customAvatar={rivalAvatar.customAvatar ?? undefined} size="lg" disableEffects />
          ) : (
            <div className="text-3xl leading-none">{rivalEmoji}</div>
          )}
          <div className="max-w-full truncate text-xs font-medium text-neo-white/60">{rivalName}</div>
          <div className="text-sm font-bold text-neo-white">{rivalScore}</div>
        </div>

        {/* Receiver column */}
        <div className="flex flex-col items-center gap-2 p-3 bg-neo-navy-light rounded-lg border-2 border-neo-black/20">
          {myAvatar ? (
            <Avatar userId={myAvatar.userId} customAvatar={myAvatar.customAvatar ?? undefined} size="lg" disableEffects />
          ) : (
            <div className="text-3xl leading-none">👤</div>
          )}
          <div className="text-xs font-medium text-neo-white/60">{t('daily.rival.you')}</div>
          <div className="text-sm font-bold text-neo-white">{myScore}</div>
        </div>
      </div>

      {/* Outcome message */}
      <div className={`text-center font-bold text-sm ${outcomeClass} uppercase tracking-wider`}>
        {outcomeMessage}
      </div>
    </m.div>
  );
}
