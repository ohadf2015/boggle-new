'use client';

import React, { memo, useState, useEffect, useMemo } from 'react';
import { m } from 'framer-motion';
import { Timer, Zap, Monitor } from 'lucide-react';
import TvJoinBar from './TvJoinBar';
import { PlayerRoster } from '../pre-game/PlayerRoster';
import { StartButton } from '../pre-game/StartButton';
import { BattleModeCard } from '../pre-game/BattleModeCard';
import { LobbyReactions } from '@/components/lobby/LobbyReactions';
import { useHostSelectedGameMode } from '@/hooks/gameState/store';
import { useGameActions } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';
import type { Language, DifficultyLevel, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import type { GameModeOption } from '@/components/GameModeSelector';

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isBot?: boolean;
}

interface TvLobbyViewProps {
  gameCode: string;
  roomLanguage: Language;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  playersReady: (string | PlayerData)[];
  /** Optional override — if omitted, manages own state from Zustand store */
  selectedGameMode?: GameModeOption;
  setSelectedGameMode?: (mode: GameModeOption) => void;
  timerValue: number;
  difficulty: DifficultyLevel;
  onStartGame: () => void;
  onExitRoom: () => void;
  tournamentCreating: boolean;
  /** Toggle back to phone/player mode */
  setHostPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * TvLobbyView — TV-optimized pre-game lobby.
 *
 * Big-screen layout: join bar at top, players + settings in a grid,
 * "waiting for players" headline, all sized for readability from couch distance.
 */
const TvLobbyView = memo<TvLobbyViewProps>(({
  gameCode,
  roomLanguage: _roomLanguage,
  username,
  t,
  playersReady,
  selectedGameMode: selectedGameModeProp,
  setSelectedGameMode: setSelectedGameModeProp,
  timerValue,
  difficulty,
  onStartGame,
  onExitRoom: _onExitRoom,
  tournamentCreating,
  setHostPlaying,
}) => {
  const { isAdmin } = useAuth();
  // TV mode = host is the screen, NOT a competitor. Strip the host record so
  // counts/roster only reflect joining players. Mirror of HostPreGameView's
  // host-not-playing filter (HostPreGameView.tsx:194-201).
  const filteredPlayers = useMemo(() => {
    return playersReady.filter((player) => {
      const name = typeof player === 'string' ? player : player.username;
      const isHostPlayer = typeof player === 'object' ? player.isHost : false;
      return !isHostPlayer && name !== username;
    });
  }, [playersReady, username]);
  const playerCount = filteredPlayers.length;
  const hostSelectedGameMode = useHostSelectedGameMode();
  const { setGameMode: setStoreGameMode, setHostSelectedGameMode } = useGameActions();
  const [localGameMode, setLocalGameMode] = useState<GameModeOption>(hostSelectedGameMode || 'random');

  const selectedGameMode = selectedGameModeProp ?? localGameMode;
  const setSelectedGameMode = setSelectedGameModeProp ?? ((mode: GameModeOption) => {
    setLocalGameMode(mode);
    setStoreGameMode(mode);
    setHostSelectedGameMode(mode);
  });

  useEffect(() => {
    const mode = selectedGameMode || 'random';
    setStoreGameMode(mode);
    setHostSelectedGameMode(mode);
  }, [selectedGameMode, setStoreGameMode, setHostSelectedGameMode]);

  return (
    <div data-testid="tv-lobby-view" className="flex flex-col h-full min-h-screen bg-neo-navy">
      {/* Join bar — QR + code at the top */}
      <TvJoinBar
        gameCode={gameCode}
        playerCount={playerCount}
        t={t}
      />

      {/* Main content grid */}
      <div className="flex-1 grid grid-cols-3 gap-6 p-8 max-w-7xl mx-auto w-full">
        {/* Left column: Players */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Waiting headline */}
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-neo-display font-black text-neo-cream text-center"
          >
            {t('tvLobby.waitingForPlayers')}
          </m.h1>

          {/* Player roster — TV-sized */}
          <div className="flex-1">
            <PlayerRoster
              players={filteredPlayers}
              username={username}
              gameCode={gameCode}
              maxPlayers={8}
              t={t}
            />
          </div>
        </div>

        {/* Right column: Settings + Start */}
        <div className="flex flex-col gap-6">
          {/* Game settings summary */}
          <div
            data-testid="tv-lobby-settings"
            className="bg-neo-navy-light border-neo rounded-neo p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-neo-cream">
              <Timer className="w-6 h-6 text-neo-cyan" />
              <span className="text-2xl font-neo-display font-bold">{timerValue}</span>
              <span className="text-lg text-neo-cream/60">{t('tvLobby.seconds')}</span>
            </div>
            <div className="flex items-center gap-3 text-neo-cream">
              <Zap className="w-6 h-6 text-neo-lime" />
              <span className="text-2xl font-neo-display font-bold capitalize">{difficulty}</span>
            </div>
          </div>

          {/* Battle mode selector */}
          <BattleModeCard
            selectedGameMode={selectedGameMode}
            setSelectedGameMode={setSelectedGameMode}
            t={t}
            isAdmin={isAdmin}
          />

          {/* Start button — big for TV */}
          <StartButton
            onStartGame={onStartGame}
            disabled={playerCount === 0}
            tournamentCreating={tournamentCreating}
            playerCount={playerCount}
            t={t}
            className="text-2xl"
          />

          {/* Toggle back to player mode */}
          {setHostPlaying && (
            <button
              data-testid="switch-to-player-mode"
              onClick={() => setHostPlaying(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 text-neo-cream/60 hover:text-neo-cream text-sm font-neo-body transition-colors"
            >
              <Monitor className="w-4 h-4" />
              {t('tvLobby.switchToPlayer')}
            </button>
          )}
        </div>
      </div>

      {/* Receive-only emoji floats — players fling reactions, the TV shows them. */}
      <LobbyReactions username={username} receiveOnly />
    </div>
  );
});

TvLobbyView.displayName = 'TvLobbyView';

export default TvLobbyView;
