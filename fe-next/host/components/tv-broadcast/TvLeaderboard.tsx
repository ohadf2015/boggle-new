'use client';

import { memo, useMemo, useRef, useEffect, Fragment } from 'react';
import { m, LayoutGroup } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Users } from 'lucide-react';
import TvPlayerCard from './TvPlayerCard';
import TvGapIndicator from './TvGapIndicator';
import LiveClassroomLeaderboard from '@/components/education/duels/LiveClassroomLeaderboard';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import type { ClassroomTeam } from '@/shared/utils/teamBattle';

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount: number;
  avatar?: AvatarType | null;
  isHost?: boolean;
  isBot?: boolean;
  presenceStatus?: PresenceStatus;
  disconnected?: boolean;
}

interface PlayerComboData {
  level: number;
  lastWordTime: number;
}

interface TvLeaderboardProps {
  players: LeaderboardEntry[];
  /**
   * Team battle rosters for this round. The tug-of-war above says which side
   * leads; this is what says which side each child is on. Absent in a
   * free-for-all and in every public room.
   */
  teams?: ClassroomTeam[];
  playerCombos?: Record<string, PlayerComboData>;
  hostUsername?: string;
  gameMode?: string | null;
  wordHuntPlayerLives?: Record<string, number>;
  wordHuntEliminatedPlayers?: string[];
  /**
   * A classroom room. A free-for-all classroom round gets the big animated
   * top-N board; team rounds keep their coloured cards, Word Hunt its lives.
   */
  classroom?: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/** Rows that fit the projector's half-panel at 1920×1080 with no scroll. */
const CLASSROOM_TOP_N = 8;

// Virtual item height for performance
const ITEM_HEIGHT = 80;
const VIRTUAL_THRESHOLD = 15;

/**
 * TvLeaderboard - Scrollable leaderboard for TV broadcast mode
 * Uses virtual scrolling for large player counts
 */
const TvLeaderboard = memo<TvLeaderboardProps>(({
  players,
  teams,
  playerCombos = {},
  hostUsername,
  gameMode,
  wordHuntPlayerLives = {},
  wordHuntEliminatedPlayers = [],
  classroom = false,
  t,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Guest students retype their nickname every round, so the lookup is
  // case-insensitive — the same rule the roster and the deal already use. A
  // name the deal has not met (a late arrival, seated at the next round start)
  // stays uncoloured rather than being guessed onto a team.
  const teamByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const team of teams ?? []) {
      for (const name of team.memberNames) map.set(name.toLowerCase(), team.id);
    }
    return map;
  }, [teams]);

  // Sort players by score (descending)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  // Use virtual scrolling only for large player counts
  const useVirtual = sortedPlayers.length > VIRTUAL_THRESHOLD;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns unstable functions by design
  const virtualizer = useVirtualizer({
    count: sortedPlayers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    enabled: useVirtual,
  });

  // Auto-scroll to show recent activity (when someone scores)
  useEffect(() => {
    // For now, we don't auto-scroll to maintain stability
    // Could be enhanced to scroll to players who just scored
  }, [sortedPlayers]);

  if (sortedPlayers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full w-full p-4"
        role="status"
        aria-live="polite"
      >
        <Users className="w-12 h-12 text-neo-black/30 mb-3" />
        <p className="text-neo-black/60 font-bold text-lg md:text-xl text-center">{t('tvBroadcast.noPlayersYet')}</p>
        <p className="text-neo-black/40 text-sm mt-2 text-center">{t('tvBroadcast.waitingForPlayers')}</p>
      </div>
    );
  }

  if (classroom && !teams?.length && gameMode !== 'word-hunt') {
    return (
      <div className="h-full overflow-hidden p-4 flex flex-col" data-testid="tv-classroom-standings">
        <h3 className="text-xl font-black uppercase text-neo-black mb-2 text-center border-b-2 border-neo-black pb-2 shrink-0">
          {t('tvBroadcast.leaderboard')}
        </h3>
        <LiveClassroomLeaderboard
          variant="projector"
          leaderboard={sortedPlayers}
          topN={CLASSROOM_TOP_N}
          gameMode={gameMode}
          className="min-h-0 flex-1"
        />
      </div>
    );
  }

  // Non-virtual rendering for small player counts — uses LayoutGroup for FLIP reordering
  if (!useVirtual) {
    return (
      <LayoutGroup>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full overflow-y-auto overscroll-contain scrollable-area p-4 flex flex-col gap-2"
        >
          <h3 className="text-xl font-black uppercase text-neo-black mb-4 text-center border-b-2 border-neo-black pb-2">
            {t('tvBroadcast.leaderboard')}
          </h3>
          {sortedPlayers.map((player, index) => (
            <Fragment key={player.username}>
              <TvPlayerCard
                username={player.username}
                teamId={teamByName.get(player.username.toLowerCase()) ?? null}
                avatar={player.avatar}
                score={player.score}
                wordCount={player.wordCount}
                rank={index + 1}
                leaderScore={sortedPlayers[0]?.score || 0}
                comboLevel={playerCombos[player.username]?.level || 0}
                isHost={player.username === hostUsername || player.isHost}
                isBot={player.isBot}
                presenceStatus={player.presenceStatus}
                disconnected={player.disconnected}
                index={index}
                gameMode={gameMode}
                lives={wordHuntPlayerLives[player.username]}
                isEliminated={wordHuntEliminatedPlayers.includes(player.username)}
                t={t}
              />
              {index === 0 && sortedPlayers.length >= 2 && (
                <TvGapIndicator
                  leaderScore={sortedPlayers[0].score}
                  secondScore={sortedPlayers[1].score}
                  leaderName={sortedPlayers[0].username}
                  secondName={sortedPlayers[1].username}
                  t={t}
                />
              )}
            </Fragment>
          ))}
        </m.div>
      </LayoutGroup>
    );
  }

  // Virtual rendering for large player counts
  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-xl font-black uppercase text-neo-black mb-4 text-center border-b-2 border-neo-black pb-2 shrink-0">
        {t('tvBroadcast.leaderboard')} ({sortedPlayers.length})
      </h3>
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto overscroll-contain scrollable-area"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const player = sortedPlayers[virtualRow.index];
            if (!player) return null;

            return (
              <div
                key={player.username}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  padding: '4px 0',
                }}
              >
                <TvPlayerCard
                  username={player.username}
                  teamId={teamByName.get(player.username.toLowerCase()) ?? null}
                  avatar={player.avatar}
                  score={player.score}
                  wordCount={player.wordCount}
                  rank={virtualRow.index + 1}
                  leaderScore={sortedPlayers[0]?.score || 0}
                  comboLevel={playerCombos[player.username]?.level || 0}
                  isHost={player.username === hostUsername || player.isHost}
                  isBot={player.isBot}
                  presenceStatus={player.presenceStatus}
                  disconnected={player.disconnected}
                  index={virtualRow.index}
                  gameMode={gameMode}
                  lives={wordHuntPlayerLives[player.username]}
                  isEliminated={wordHuntEliminatedPlayers.includes(player.username)}
                  t={t}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

TvLeaderboard.displayName = 'TvLeaderboard';

export default TvLeaderboard;
