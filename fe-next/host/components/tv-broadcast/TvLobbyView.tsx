'use client';

import React, { memo, useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Zap, Monitor } from 'lucide-react';
import TvJoinBar from './TvJoinBar';
import { PlayerRoster } from '../pre-game/PlayerRoster';
import { StartButton } from '../pre-game/StartButton';
import { BattleModeCard } from '../pre-game/BattleModeCard';
import { LobbyReactions } from '@/components/lobby/LobbyReactions';
import ProjectorLobby from '@/components/education/projector/ProjectorLobby';
import { useHostSelectedGameMode } from '@/hooks/gameState/store';
import { useGameActions } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketOptional } from '@/utils/SocketContext';
import { useLobbyAutoStart } from '@/hooks/useLobbyAutoStart';
import { useClassroomModeSeed } from '../../hooks/useClassroomModeSeed';
import type { Language, DifficultyLevel, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import type { GameModeOption } from '@/components/GameModeSelector';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { LobbySettingsSummary } from '@/components/multiplayer/lobby/LobbySettingsSummary';

/** How long to wait for auto-filled stand-ins to appear on the roster before giving up. */
const SOLO_DEMO_FILL_TIMEOUT_MS = 8000;

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
  /** Fill room with 3 bots then start game (classroom teacher demo with zero students) */
  onStartSoloDemoWithBots?: () => (() => void);
  /**
   * Usernames the server reports as lobby-ready (`playersReadyUpdate`). Without
   * it the roster's ready chip is structurally stuck at 0/N: the denominator
   * comes from the roster, the numerator only from this list. That was the
   * "0/2 READY that never moved" a teacher watched while both students tapped
   * READY UP — HostPreGameView passed it, this lobby did not.
   */
  readyUsernames?: string[];
  /** Room was opened from the teacher dashboard (`?classroom=true`). */
  isClassroomMode?: boolean;
  /**
   * The mode the teacher fixed at setup. In a classroom room the mode is not the
   * host's to change here, so the arcade picker is hidden and the start control
   * takes the matching label from the classroom registry in shared/types/vocabQuiz.
   */
  classroomGameMode?: ClassroomGameMode;
  /** Lesson the teacher picked at setup (their own sessionStorage copy). */
  lessonName?: string;
  /** How many vocabulary words that lesson carries. */
  wordCount?: number;
  /** The teacher's own copy of the room settings, before the server record lands. */
  classroomTemplateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

/** Start-button copy for a classroom room, by the mode the teacher already chose. */
function classroomStartLabelKey(mode: ClassroomGameMode | undefined): string {
  return mode === VOCAB_QUIZ_MODE ? 'hostView.startQuiz' : 'hostView.startClassGame';
}

/**
 * TvLobbyView — TV-optimized pre-game lobby.
 *
 * Big-screen layout: join bar at top, players + settings in a grid,
 * "waiting for players" headline, all sized for readability from couch distance.
 */
const TvLobbyView = memo<TvLobbyViewProps>(({
  gameCode,
  roomLanguage,
  username,
  t,
  playersReady,
  selectedGameMode: selectedGameModeProp,
  setSelectedGameMode: setSelectedGameModeProp,
  timerValue,
  difficulty,
  onStartGame,
  onExitRoom,
  tournamentCreating,
  setHostPlaying,
  onStartSoloDemoWithBots,
  readyUsernames = [],
  isClassroomMode = false,
  classroomGameMode,
  lessonName,
  wordCount,
  classroomTemplateSettings = null,
}) => {
  const { isAdmin, canSeeInWorkModes } = useAuth();
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
  // The projector prints names, so it needs the roster in one shape — the
  // arcade lobby accepts bare strings as well as records.
  const projectorStudents = useMemo(
    () =>
      filteredPlayers.map((player) =>
        typeof player === 'string'
          ? { username: player }
          : { username: player.username, isBot: player.isBot, avatar: player.avatar }
      ),
    [filteredPlayers]
  );
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
    // A classroom lobby has no mode picker: its start intent is the teacher's
    // launch-time mode (seeded below) or an in-place switch. Writing the local
    // default here re-ran after the seed whenever React re-ran effects, and
    // the room launched as a random roll — CLASSIC played as Word Hunt.
    if (isClassroomMode) return;
    const mode = selectedGameMode || 'random';
    setStoreGameMode(mode);
    setHostSelectedGameMode(mode);
  }, [isClassroomMode, selectedGameMode, setStoreGameMode, setHostSelectedGameMode]);

  useClassroomModeSeed({ isClassroomMode, gameCode, classroomGameMode });

  // Solo demo flow: teacher presses button → emit setAutoFill → wait for bots to seat → call startGame
  const [soloDemoInProgress, setSoloDemoInProgress] = useState(false);
  const [soloDemoCallback, setSoloDemoCallback] = useState<(() => void) | null>(null);

  const [soloDemoFailed, setSoloDemoFailed] = useState(false);

  // When bots are seated (playerCount > 0), invoke the callback to start the game
  useEffect(() => {
    if (soloDemoInProgress && soloDemoCallback && playerCount > 0) {
      soloDemoCallback();
      setSoloDemoInProgress(false);
      setSoloDemoCallback(null);
    }
  }, [soloDemoInProgress, soloDemoCallback, playerCount]);

  // If the fill never lands, say so instead of leaving the button disabled
  // forever — a silently stuck control is the failure mode this repo keeps
  // shipping, and a teacher standing at a projector deserves a reason.
  useEffect(() => {
    if (!soloDemoInProgress) return;
    const timeout = setTimeout(() => {
      setSoloDemoInProgress(false);
      setSoloDemoCallback(null);
      setSoloDemoFailed(true);
    }, SOLO_DEMO_FILL_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [soloDemoInProgress]);

  const handleSoloDemoClick = () => {
    if (!onStartSoloDemoWithBots) return;
    setSoloDemoFailed(false);
    setSoloDemoInProgress(true);
    const callback = onStartSoloDemoWithBots();
    setSoloDemoCallback(() => callback);
  };

  // A classroom room gets ONE surface. The arcade TV lobby stacks a join bar, a
  // roster, a settings card and a mode picker; on a projector, above
  // `ClassroomModeBanner`'s own code + QR panel, that was two join codes and two
  // QRs on the same wall. `ProjectorLobby` is the collapsed surface, and the
  // banner stands down for a host in the lobby (see ClassroomModeBanner).
  if (isClassroomMode) {
    return (
      <>
        <ProjectorLobby
          gameCode={gameCode}
          language={roomLanguage}
          students={projectorStudents}
          readyUsernames={readyUsernames}
          t={t}
          onStartGame={onStartGame}
          onExitRoom={onExitRoom}
          startLabelKey={classroomStartLabelKey(classroomGameMode)}
          starting={tournamentCreating}
          lessonName={lessonName}
          wordCount={wordCount}
          classroomGameMode={classroomGameMode}
          templateSettings={classroomTemplateSettings}
          autoStartSecondsLeft={autoStartSecondsLeft}
          onCancelAutoStart={cancelAutoStart}
          onStartPracticeRound={onStartSoloDemoWithBots ? handleSoloDemoClick : undefined}
          practiceRoundPending={soloDemoInProgress}
          practiceRoundFailed={soloDemoFailed}
        />
        {/* Receive-only emoji floats — students fling reactions, the wall shows them. */}
        <LobbyReactions username={username} receiveOnly />
      </>
    );
  }

  // Same address the join bar encodes, so both QRs land in the same place.
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/${roomLanguage}/join/${gameCode}` : '';

  // Projector lobby, 10-ft readable: persistent join bar on top (the same bar
  // the round broadcast keeps), then the room — seats + mode — beside a hero
  // join card (QR + code) and the one START. Fits 1920×1080 with no scroll.
  return (
    <div data-testid="tv-lobby-view" className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-neo-navy text-neo-white tv:[--mp-u:1.25]">
      <TvJoinBar gameCode={gameCode} playerCount={playerCount} language={roomLanguage} t={t} />

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 tv:gap-10 px-6 py-5 tv:px-10 tv:py-6 w-full max-w-[1800px] mx-auto">
        {/* Left: who's in + what we play */}
        <div className="col-span-7 min-h-0 flex flex-col gap-4 tv:gap-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-neo-display font-bold text-[clamp(28px,4.4vh,52px)] text-neo-white leading-tight">
              {t('tvLobby.waitingForPlayers')}
            </h1>
            <span
              data-testid="tv-view-only-badge"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-neo-black bg-neo-cyan text-neo-black text-sm tv:text-lg font-bold uppercase tracking-wider shadow-hard-sm"
            >
              <Monitor aria-hidden="true" className="w-4 h-4 tv:w-5 tv:h-5 shrink-0" />
              {t('tvLobby.viewOnlyBadge')}
            </span>
          </div>
          <div className="shrink-0 rounded-neo-lg border-3 border-neo-black bg-neo-navy-light/70 shadow-hard p-4 tv:p-5">
            <PlayerRoster
              players={filteredPlayers}
              username={username}
              gameCode={gameCode}
              maxPlayers={8}
              readyUsernames={readyUsernames}
              t={t}
              variant="tv"
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col rounded-neo-lg border-3 border-neo-black bg-neo-navy-light/70 shadow-hard p-4 tv:p-5">
            <BattleModeCard
              fill
              selectedGameMode={selectedGameMode}
              setSelectedGameMode={setSelectedGameMode}
              t={t}
              isAdmin={isAdmin}
              showInWorkModes={canSeeInWorkModes}
              language={roomLanguage}
            />
          </div>
        </div>

        {/* Right: the join card, settings, START */}
        <div className="col-span-5 min-h-0 flex flex-col gap-4 tv:gap-6">
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 rounded-neo-lg border-3 border-neo-black bg-neo-purple/20 shadow-hard p-4 tv:p-6 text-center">
            <p className="font-neo-display font-bold uppercase tracking-wider text-neo-lime text-xl tv:text-3xl">
              {t('mpUi.lobby.tvJoinHeadline')}
            </p>
            <div className="rounded-neo border-4 border-neo-black bg-white p-3 shadow-hard">
              <QRCodeSVG
                value={joinUrl || gameCode}
                size={360}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
                className="block w-[min(360px,30vh)] h-[min(360px,30vh)]"
                role="img"
                aria-label={t('hostView.scanToJoin')}
              />
            </div>
            <span
              dir="ltr"
              data-testid="tv-lobby-code"
              className="font-neo-display font-bold uppercase leading-none tracking-[0.15em] text-neo-white text-[min(120px,10vh)]"
            >
              {gameCode}
            </span>
          </div>

          <div data-testid="tv-lobby-settings" className="shrink-0">
            <LobbySettingsSummary timerValue={timerValue} difficulty={difficulty} t={t} className="text-xl tv:text-2xl py-3 bg-neo-navy-light" />
          </div>

          {autoStartSecondsLeft !== null && (
            <div className="shrink-0 bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo-lg px-4 py-3 flex items-center justify-between shadow-hard" role="status" aria-live="polite">
              <span className="font-neo-display font-bold text-xl flex items-center gap-2">
                <Zap aria-hidden="true" className="w-5 h-5 shrink-0" />
                {t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}
              </span>
              <button
                type="button"
                onClick={cancelAutoStart}
                className="text-sm font-bold uppercase border-2 border-neo-black bg-neo-navy text-neo-lime rounded-neo px-4 py-1.5 shrink-0"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}

          <div className="shrink-0">
            <StartButton
              onStartGame={onStartGame}
              disabled={playerCount === 0}
              tournamentCreating={tournamentCreating}
              playerCount={playerCount}
              t={t}
              labelKey={isClassroomMode ? classroomStartLabelKey(classroomGameMode) : undefined}
            />
          </div>

          {(onStartSoloDemoWithBots || setHostPlaying) && (
            <div className="shrink-0 flex gap-3">
              {onStartSoloDemoWithBots && (
                <button
                  type="button"
                  data-testid="solo-demo-button"
                  onClick={handleSoloDemoClick}
                  disabled={playerCount > 0 || soloDemoInProgress}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-lime disabled:opacity-50 disabled:cursor-not-allowed text-base font-bold shadow-hard-sm active:translate-y-0.5 active:shadow-none"
                >
                  <Zap aria-hidden="true" className="w-5 h-5 shrink-0" />
                  {soloDemoInProgress ? t('common.loading') : t('tvLobby.tryPracticeRound')}
                </button>
              )}
              {/* Back to phone/player mode — plain to find for a host who landed here by mistake. */}
              {setHostPlaying && (
                <button
                  type="button"
                  data-testid="switch-to-player-mode"
                  onClick={() => setHostPlaying(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white text-base font-bold shadow-hard-sm active:translate-y-0.5 active:shadow-none"
                >
                  <Monitor aria-hidden="true" className="w-5 h-5 shrink-0" />
                  {t('tvLobby.switchToPlayer')}
                </button>
              )}
            </div>
          )}

          {soloDemoFailed && (
            <p data-testid="solo-demo-failed" role="status" className="text-center text-base font-bold text-neo-pink">
              {t('tvLobby.practiceRoundFailed')}
            </p>
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
