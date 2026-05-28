'use client';

import { useMemo, memo } from 'react';
import { m } from 'framer-motion';
import { TrendingUp, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WordObject } from './types';

interface TurningPointCardProps {
  /** All player words by username (with timeSinceStart) */
  allPlayerWords: Record<string, WordObject[]>;
  /** Current username */
  currentUsername: string;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface LeadChange {
  time: number;
  newLeader: string;
  word: string;
  wordScore: number;
}

/**
 * TurningPointCard — shows the single moment that decided the game.
 * Analyzes cumulative scores over time to find when the lead last changed.
 */
const TurningPointCard = memo<TurningPointCardProps>(({ allPlayerWords, currentUsername, t }) => {
  const turningPoint = useMemo(() => {
    const players = Object.keys(allPlayerWords);
    if (players.length < 2) return null;

    // Build time-sorted event list: each word with its player and cumulative score
    const events: Array<{ time: number; player: string; word: string; score: number }> = [];
    for (const [player, words] of Object.entries(allPlayerWords)) {
      for (const w of words) {
        if (w.timeSinceStart != null && w.validated && !w.isDuplicate && w.score > 0) {
          events.push({ time: w.timeSinceStart, player, word: w.word, score: w.score });
        }
      }
    }

    if (events.length < 4) return null; // Not enough data
    events.sort((a, b) => a.time - b.time);

    // Walk through events, tracking cumulative scores and lead changes
    const cumulative: Record<string, number> = {};
    players.forEach(p => { cumulative[p] = 0; });

    let currentLeader = '';
    const leadChanges: LeadChange[] = [];

    for (const event of events) {
      cumulative[event.player] += event.score;

      // Find who's leading now
      let maxScore = -1;
      let leader = '';
      for (const [p, s] of Object.entries(cumulative)) {
        if (s > maxScore) { maxScore = s; leader = p; }
      }

      if (leader !== currentLeader && currentLeader !== '') {
        leadChanges.push({
          time: event.time,
          newLeader: leader,
          word: event.word,
          wordScore: event.score,
        });
      }
      currentLeader = leader;
    }

    if (leadChanges.length === 0) return null;

    // The last lead change is the "turning point"
    const lastChange = leadChanges[leadChanges.length - 1];

    // Calculate how long the previous leader was ahead
    const totalGameTime = Math.max(...events.map(e => e.time), 180);
    const timeLeading = totalGameTime - lastChange.time;

    return {
      ...lastChange,
      totalLeadChanges: leadChanges.length,
      timeLeading: Math.round(timeLeading),
      isCurrentPlayer: lastChange.newLeader === currentUsername,
    };
  }, [allPlayerWords, currentUsername]);

  if (!turningPoint) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 280, damping: 26 }}
      className={cn(
        'p-3 rounded-neo border-2 shadow-hard-sm',
        turningPoint.isCurrentPlayer
          ? 'bg-neo-lime/15 border-neo-lime/40'
          : 'bg-neo-pink/15 border-neo-pink/40'
      )}
    >
      <div className="flex items-start gap-2">
        <Swords className={cn(
          'w-4 h-4 mt-0.5 shrink-0',
          turningPoint.isCurrentPlayer ? 'text-neo-lime' : 'text-neo-pink'
        )} />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wide text-neo-white mb-0.5">
            {t('results.turningPoint')}
          </div>
          <p className="text-xs font-bold text-neo-white leading-snug">
            {turningPoint.isCurrentPlayer
              ? t('results.turningPointYou', {
                  word: turningPoint.word.toUpperCase(),
                  score: turningPoint.wordScore,
                })
              : t('results.turningPointOpponent', {
                  player: turningPoint.newLeader,
                  word: turningPoint.word.toUpperCase(),
                  score: turningPoint.wordScore,
                })
            }
          </p>
          {turningPoint.totalLeadChanges > 1 && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-neo-cyan" />
              <span className="text-[10px] text-neo-white font-bold">
                {t('results.leadChanges', { count: turningPoint.totalLeadChanges })}
              </span>
            </div>
          )}
        </div>
      </div>
    </m.div>
  );
});

TurningPointCard.displayName = 'TurningPointCard';

export default TurningPointCard;
