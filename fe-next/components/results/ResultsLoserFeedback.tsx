'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Zap } from 'lucide-react';

interface ResultsLoserFeedbackProps {
  rank: number;
  onPlayAgain: () => void;
  t: (key: string) => string;
}

function getMessageKey(rank: number): string {
  if (rank === 4) return 'results.loserFeedback.almostPodium';
  if (rank <= 7) return 'results.loserFeedback.goodFight';
  return 'results.loserFeedback.solidTry';
}

const ResultsLoserFeedback = memo<ResultsLoserFeedbackProps>(function ResultsLoserFeedback({
  rank,
  onPlayAgain,
  t,
}) {
  if (rank <= 3) return null;

  return (
    <m.div
      data-testid="loser-feedback"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.9 }}
      className="bg-neo-navy border-2 border-neo-black rounded-neo shadow-hard-sm px-4 py-3 flex items-center gap-3"
    >
      <div className="shrink-0 w-9 h-9 rounded-neo bg-neo-purple/20 border-2 border-neo-purple flex items-center justify-center">
        <Zap className="w-4 h-4 text-neo-purple" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-neo-white uppercase tracking-wide leading-tight">
          {t(getMessageKey(rank))}
        </p>
        <p className="text-[11px] text-neo-white mt-0.5">
          {t('results.loserFeedback.encouragement')}
        </p>
      </div>

      <m.button
        onClick={onPlayAgain}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="shrink-0 bg-neo-pink text-white text-xs font-black uppercase px-3 py-2 rounded-neo border-2 border-neo-black shadow-hard-sm"
      >
        {t('results.playAgain')}
      </m.button>
    </m.div>
  );
});

export default ResultsLoserFeedback;
