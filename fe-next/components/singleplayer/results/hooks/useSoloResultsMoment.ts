import { useMemo } from 'react';
import { pickNearMiss, pickResultsCelebration, type NearMiss } from '../nearMiss';
import type { ProgressSnapshot } from '../progressSnapshot';
import type { MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';

interface SoloResultsMomentInput {
  snapshot: ProgressSnapshot;
  isNewHighScore: boolean;
  scoreIsRecord: boolean;
  /** Solo-bots only: participants sorted by score, highest first. */
  participants: Array<{ name: string; score: number; isPlayer: boolean }>;
  playerRank: number;
  isWinner: boolean;
  isBotMatch: boolean;
  longestWordLength: number;
}

export function useSoloResultsMoment(input: SoloResultsMomentInput): {
  nearMiss: NearMiss | null;
  celebration: MascotCelebrationKind | null;
} {
  const { snapshot, isNewHighScore, scoreIsRecord, participants, playerRank, isWinner, isBotMatch, longestWordLength } = input;
  return useMemo(() => {
    const above = isBotMatch && playerRank > 1 ? participants[playerRank - 2] : undefined;
    const nearMiss = pickNearMiss({
      score: snapshot.score,
      best: snapshot.best,
      isNewBest: snapshot.isNewBest,
      hasHistory: snapshot.nextGoal.kind !== 'first',
      isRecord: isNewHighScore || scoreIsRecord,
      rival: above ? { name: above.name, score: above.score } : null,
    });
    const celebration = snapshot.score > 0
      ? pickResultsCelebration({
          won: isBotMatch && participants.length > 1 && isWinner,
          newBest: nearMiss?.kind === 'newBest',
          rank: playerRank,
          totalPlayers: participants.length,
          hadBingo: longestWordLength >= 7,
        })
      : null;
    return { nearMiss, celebration };
  }, [snapshot, isNewHighScore, scoreIsRecord, participants, playerRank, isWinner, isBotMatch, longestWordLength]);
}
