'use client';

import { memo, type ComponentProps } from 'react';
import TvResultsWinnersPodium from './TvResultsWinnersPodium';
import TvResultsStatsGrid from './TvResultsStatsGrid';
import TvResultsAwards from './TvResultsAwards';
import TvResultsPlayerSpotlight from './TvResultsPlayerSpotlight';
import TvResultsLeaderboard from './TvResultsLeaderboard';
import type { AnimationPhase } from './useTvResultsAnimation';
import { useTallScreen } from './useTallScreen';

type PodiumPlayers = ComponentProps<typeof TvResultsWinnersPodium>['players'];
type RoundPlayers = ComponentProps<typeof TvResultsStatsGrid>['players'];
type RankedPlayers = ComponentProps<typeof TvResultsLeaderboard>['players'];

interface TvResultsArcadeStageProps {
  podiumPlayers: PodiumPlayers;
  players: RoundPlayers;
  rankedPlayers: RankedPlayers;
  gameDuration: number;
  isVisible: (phase: AnimationPhase) => boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/** Every slot is reserved up front so the phased reveal never reflows what is already on screen. */
const TvResultsArcadeStage = memo<TvResultsArcadeStageProps>(({
  podiumPlayers,
  players,
  rankedPlayers,
  gameDuration,
  isVisible,
  t,
}) => {
  const tall = useTallScreen();
  const hasStandings = rankedPlayers.length > 3;

  return (
    <main
      data-testid="tv-results-stage"
      className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[minmax(0,1fr)_auto] gap-x-[clamp(1.5rem,2.5vw,3rem)] gap-y-[clamp(0.75rem,2vh,1.5rem)] px-[clamp(1.5rem,3vw,3.5rem)] pb-[clamp(0.75rem,2vh,1.5rem)]"
    >
      <div className="col-span-7 min-h-0">
        <TvResultsWinnersPodium
          players={podiumPlayers}
          show3rd={isVisible('podium-3rd')}
          show2nd={isVisible('podium-2nd')}
          show1st={isVisible('podium-1st')}
          showConfetti={isVisible('confetti')}
          t={t}
        />
      </div>

      <div className="col-span-5 flex min-h-0 flex-col justify-center gap-4 pt-2">
        <div className="shrink-0">
          <TvResultsStatsGrid players={players} visible={isVisible('stats')} max={!tall && hasStandings ? 2 : 4} t={t} />
        </div>
        {hasStandings && (
          <div className="min-h-0 flex-1">
            <TvResultsLeaderboard
              players={rankedPlayers}
              visible={isVisible('leaderboard')}
              startRank={4}
              maxVisible={10}
              t={t}
            />
          </div>
        )}
      </div>

      <div className="col-span-7">
        <TvResultsAwards players={players} visible={isVisible('awards')} gameDuration={gameDuration} t={t} />
      </div>

      <div className="col-span-5">
        <TvResultsPlayerSpotlight players={players} visible={isVisible('player-spotlight')} gameDuration={gameDuration} maxVisible={tall ? 4 : 2} t={t} />
      </div>
    </main>
  );
});

TvResultsArcadeStage.displayName = 'TvResultsArcadeStage';

export default TvResultsArcadeStage;
