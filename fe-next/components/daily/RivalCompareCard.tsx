'use client';

import React from 'react';
import { m } from 'framer-motion';

interface RivalCompareCardProps {
  rivalName: string;
  rivalEmoji: string;
  rivalScore: number;
  myScore: number;
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
  t,
}: RivalCompareCardProps) {
  // Determine outcome
  let outcome: 'win' | 'lose' | 'tie';
  let outcomeMessage: string;
  let outcomeClass: string;

  if (myScore > rivalScore) {
    outcome = 'win';
    outcomeMessage = t('daily.rival.youWin').replace('{name}', rivalName);
    outcomeClass = 'text-neo-lime';
  } else if (myScore < rivalScore) {
    outcome = 'lose';
    outcomeMessage = t('daily.rival.youLose').replace('{name}', rivalName);
    outcomeClass = 'text-neo-pink';
  } else {
    outcome = 'tie';
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
          <div className="text-3xl">{rivalEmoji}</div>
          <div className="text-xs font-medium text-neo-white/60">{rivalName}</div>
          <div className="text-sm font-bold text-neo-white">{rivalScore}</div>
        </div>

        {/* Receiver column */}
        <div className="flex flex-col items-center gap-2 p-3 bg-neo-navy-light rounded-lg border-2 border-neo-black/20">
          <div className="text-3xl">👤</div>
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
