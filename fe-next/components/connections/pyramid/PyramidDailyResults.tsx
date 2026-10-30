'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PyramidState } from '@/lib/connections/pyramid/gameLogic';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import ConnectionsDailyResults from '../ConnectionsDailyResults';
import { totalMisses } from '../RegularDailyResults';
import PyramidProgress from './PyramidProgress';

interface PyramidDailyResultsProps {
  pyramid: PyramidState['pyramid'];
  state: PyramidState;
  /** Stages 0–2 are the base riddles, 3 the finale. */
  outcomes: readonly BridgeOutcome[];
  celebrate: boolean;
  shareText: string;
  progressSlot?: ReactNode;
  notice?: ReactNode;
}

/** A pyramid day's end screen, in the same layout as the 5-riddle chain's. */
export default function PyramidDailyResults({ pyramid, state, outcomes, celebrate, shareText, progressSlot, notice }: PyramidDailyResultsProps) {
  const { t } = useLanguage();
  const won = state.status === 'won';
  const solved = outcomes.filter((o) => o.solved).length;

  return (
    <ConnectionsDailyResults
      outcome={won ? 'win' : 'loss'}
      headline={t(won ? 'connections.pyramid.won' : 'connections.pyramid.lost')}
      eyebrow={<span dir="auto">{t('connections.pyramid.topWord', { word: pyramid.metaAnswer })}</span>}
      score={state.score}
      stats={[
        { value: `${solved}/4`, label: t('connections.daily.solvedLabel') },
        { value: totalMisses(outcomes), label: t('connections.daily.missesLabel') },
      ]}
      meter={
        <PyramidProgress
          stage={3}
          solvedBridges={state.solvedBridges}
          gaveUpBase={state.gaveUpBase}
          metaAnswer={pyramid.metaAnswer}
          won={won}
        />
      }
      celebrate={celebrate}
      shareText={shareText}
      progressSlot={progressSlot}
      notice={notice}
      answerKey={{
        puzzles: pyramid.base,
        solvedIndices: new Set(pyramid.base.flatMap((_, i) => (outcomes[i]?.solved ? [i] : []))),
      }}
      ctaSource="pyramid_daily_results"
    />
  );
}
