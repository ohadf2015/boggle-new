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
import { useSocketOptional } from '@/utils/SocketContext';
import { useLobbyAutoStart } from '@/hooks/useLobbyAutoStart';
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
  // Display the server-owned auto-start countdown on the TV screen too, with a
  // Cancel so a spectating host can still abort (the start itself fires from
  // HostView's hook regardless of which lobby surface is mounted).
  const socketCtx = useSocketOptional();
  const { secondsLeft: autoStartSecondsLeft, cancel: cancelAutoStart } = useLobbyAutoStart({
    socket: socketCtx?.socket ?? null,
  });
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

      {/* View-only badge — always-on reminder that the host is the screen, not a
          competitor. The first-toggle tutorial says this once; this carries the
          message for repeat hosts the tutorial won't re-show for. */}
      <div className="flex justify-center pt-4">
        <span
          data-testid="tv-view-only-badge"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-neo-cyan bg-neo-cyan/15 text-neo-cyan text-sm font-bold uppercase tracking-wider shadow-hard-sm"
        >
          <Monitor className="w-4 h-4 shrink-0" />
          {t('tvLobby.viewOnlyBadge')}
        </span>
      </div>

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

          {/* Auto-start countdown banner (everyone ready) */}
          {autoStartSecondsLeft !== null && (
            <div className="bg-neo-lime/20 border-3 border-neo-lime rounded-neo-lg px-4 py-3 flex items-center justify-between shadow-hard" role="status" aria-live="polite">
              <span className="text-neo-lime font-neo-display font-bold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 shrink-0" />
                {t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}
              </span>
              <button
                onClick={cancelAutoStart}
                className="text-sm font-bold uppercase text-neo-lime border-2 border-neo-lime/60 rounded-lg px-4 py-1.5 hover:bg-neo-lime/10 transition-colors shrink-0"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}

          {/* Start button — big for TV */}
          <StartButton
            onStartGame={onStartGame}
            disabled={playerCount === 0}
            tournamentCreating={tournamentCreating}
            playerCount={playerCount}
            t={t}
            className="text-2xl"
          />

          {/* Exit TV mode → switch back to phone/player mode. Prominent so a host
              who landed here by mistake can clearly find the way out. */}
          {setHostPlaying && (
            <button
              data-testid="switch-to-player-mode"
              onClick={() => setHostPlaying(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light text-neo-cream hover:bg-neo-cream/10 hover:border-neo-cream text-base font-bold shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all"
            >
              <Monitor className="w-5 h-5 shrink-0" />
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
