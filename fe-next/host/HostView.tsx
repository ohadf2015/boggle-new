'use client';

/**
 * HostView — the host's phase router. All state and effects live in
 * `useHostPhase` (+ useHostRoundLifecycle); this file only picks what to show:
 * countdown, phone lobby / TV lobby, phone round / TV broadcast, TV results,
 * dialogs. Each phone view renders inside its piece's screen stub
 * (HostLobbyScreen, MpRoundScreen, MpCountdown). FROZEN after FOUNDATION.
 */
import React, { memo } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import '../style/animation.scss';
import type { PlayerResult, Language } from '@/types';
import {
  sendCountdownComplete,
  consumeStashedMessageId,
} from '@/shared/utils/gameEventUtils';
import HostPreGameView from './components/HostPreGameView';
import HostInGameView from './components/HostInGameView';
import TvBroadcastView from './components/TvBroadcastView';
import { projectorShowsQuiz } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import TvLobbyView from './components/tv-broadcast/TvLobbyView';
import { TvResultsView } from './components/tv-results';
import {
  QRCodeDialog,
  FinalScoresModal,
  ExitConfirmDialog,
  CancelTournamentDialog,
  SoloStartConfirmDialog,
} from './components/HostDialogs';
import { HostLobbyScreen } from '@/components/multiplayer/lobby/HostLobbyScreen';
import { MpRoundScreen } from '@/components/multiplayer/round/MpRoundScreen';
import { MpCountdown } from '@/components/multiplayer/round/MpCountdown';
import { useHostPhase } from './hooks/useHostPhase';
import { useClassroomSettingsSeed } from './hooks/useClassroomSettingsSeed';
import { readLocalQuizVariant } from '@/lib/education/classroomCatalogueId';
import type { HostViewProps } from './hostViewTypes';

export type { HostViewProps } from './hostViewTypes';

const HostView: React.FC<HostViewProps> = memo((props) => {
  const {
    gameCode, username, lessonData, classroomLive = null, isPrivate = false, isQuickPlay = false,
    isClassroomMode = false,
  } = props;
  const {
    t, language, socket, state, runtime, settings, players, tournament, animation, ui, hostPlayingState, combo,
    actions, lobbyAutoStart, playersReadyData, currentGameMode, earthquakeState, fireRoundActive,
    fireRoundRemaining, hasActiveGameData, resolvedClassroomGameMode, isVocabQuizRoom,
    handleHostNameChange, handleHostAvatarChange,
  } = useHostPhase(props);

  useClassroomSettingsSeed({
    isClassroomMode,
    gameCode,
    templateSettings: lessonData?.templateSettings,
    setTimerValue: state.setTimerValue,
    setDifficulty: state.setDifficulty,
    setMinWordLength: state.setMinWordLength,
  });

  // Navigation hiding is managed by PageClient based on isActive/showResults

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-navy">
      {/* GO Animation */}
      {runtime.showStartAnimation && (
        <MpCountdown>
        <GoRipplesAnimation
          onComplete={() => {
            state.setShowStartAnimation(false);
            const id = consumeStashedMessageId('HOST');
            if (socket) sendCountdownComplete(socket, id, 'HOST');
          }}
          t={t}
          players={players.playersReady as unknown as React.ComponentProps<typeof GoRipplesAnimation>['players']}
          classroom={isClassroomMode ? { mode: resolvedClassroomGameMode ?? null, vocabQuizVariant: readLocalQuizVariant() } : null}
        />
        </MpCountdown>
      )}

      {/* Dialogs */}
      {/* TV Results View - Full screen for broadcast mode (host NOT playing).
          Classroom rooms are FORCED into broadcast mode, so for a teacher this
          view — not ResultsPage — is the whole end-of-game moment; that is why
          it needs classroomSummary. */}
      {!!tournament.finalScores && !settings.hostPlaying && !runtime.waitingForResults && (
        <TvResultsView
          finalScores={(tournament.finalScores?.players ?? []) as unknown as PlayerResult[]}
          tournamentData={tournament.tournamentData as Parameters<typeof FinalScoresModal>[0]['tournamentData']}
          username={username}
          playersReady={playersReadyData}
          gameDuration={settings.timerValue * 60}
          classroomSummary={tournament.finalScores?.classroomSummary}
          onStartNewGame={() => {
            state.setFinalScores(null);
            actions.handleStartNewGame({ gameMode: currentGameMode }); // same list, same code, same GAME
          }}
          onNextRound={() => {
            state.setFinalScores(null);
            actions.handleNextRound();
          }}
          onShowQR={() => state.setShowQR(true)}
          onClose={() => state.setFinalScores(null)}
          t={t}
          socket={socket}
          gameCode={gameCode}
          language={state.roomLanguage}
          isTeacher={!!lessonData}
          allWords={((tournament.finalScores?.players ?? []) as unknown as PlayerResult[]).flatMap((p) =>
            (p.allWords ?? []).map(w => ({ word: w.word, score: w.score ?? 0, foundBy: [p.username] }))
          )}
          gameMode={currentGameMode}
          onExitRoom={isClassroomMode ? actions.handleExitRoom : undefined}
        />
      )}

      {/* Standard Results Modal - for when host IS playing */}
      <FinalScoresModal
        open={!!tournament.finalScores && settings.hostPlaying}
        onOpenChange={(open) => {
          if (!open) state.setFinalScores(null);
        }}
        finalScores={(tournament.finalScores?.players ?? []) as unknown as PlayerResult[]}
        tournamentData={tournament.tournamentData as Parameters<typeof FinalScoresModal>[0]['tournamentData']}
        username={username}
        t={t}
        onStartNewGame={actions.handleStartNewGame}
        onNextRound={actions.handleNextRound}
        socket={socket}
        playersReady={playersReadyData}
        wordHuntSummary={tournament.finalScores?.wordHuntSummary}
      />

      <QRCodeDialog
        open={ui.showQR}
        onOpenChange={state.setShowQR}
        gameCode={gameCode}
        t={t}
      />

      <CancelTournamentDialog
        open={ui.showCancelTournamentDialog}
        onOpenChange={state.setShowCancelTournamentDialog}
        onConfirm={actions.handleCancelTournament}
        t={t}
      />

      <ExitConfirmDialog
        open={ui.showExitConfirm}
        onOpenChange={state.setShowExitConfirm}
        onConfirm={actions.confirmExitRoom}
        t={t}
        classroom={isClassroomMode}
      />

      <SoloStartConfirmDialog
        open={ui.showSoloConfirm}
        onOpenChange={state.setShowSoloConfirm}
        onConfirm={actions.confirmSoloStart}
        t={t}
        gameCode={gameCode}
      />



      {/* Pre-Game View — phone lobby (host playing) */}
      {!runtime.gameStarted && !runtime.waitingForResults && !runtime.showStartAnimation && !hasActiveGameData && settings.hostPlaying && (
        <HostLobbyScreen>
        <HostPreGameView
          gameCode={gameCode}
          roomLanguage={state.roomLanguage}
          language={language as Language}
          username={username}
          t={t}
          timerValue={settings.timerValue}
          setTimerValue={state.setTimerValue}
          timerDirection={settings.timerDirection}
          setTimerDirection={state.setTimerDirection}
          difficulty={settings.difficulty}
          setDifficulty={state.setDifficulty}
          minWordLength={settings.minWordLength}
          setMinWordLength={state.setMinWordLength}
          gameType={settings.gameType}
          setGameType={state.setGameType}
          tournamentRounds={settings.tournamentRounds}
          setTournamentRounds={state.setTournamentRounds}
          tournamentData={tournament.tournamentData}
          hostPlaying={settings.hostPlaying}
          setHostPlaying={state.setHostPlaying}
          playersReady={players.playersReady as any}
          readyUsernames={playersReadyData?.readyUsernames ?? []}
          readyTotal={playersReadyData?.totalPlayers ?? 0}
          autoStartSecondsLeft={lobbyAutoStart.secondsLeft}
          onCancelAutoStart={lobbyAutoStart.cancel}
          playerWordCounts={players.playerWordCounts}
          shufflingGrid={animation.shufflingGrid}
          highlightedCells={animation.highlightedCells}
          tableData={runtime.tableData}
          onStartGame={actions.startGame}
          onAutoStartWithBots={actions.confirmSoloStart}
          onExitRoom={actions.handleExitRoom}
          onCancelTournament={actions.handleCancelTournamentDialog}
          onRegenerateBoard={actions.regenerateBoard}
          tournamentCreating={tournament.tournamentCreating}
          lessonData={lessonData}
          onNameChange={handleHostNameChange}
          onAvatarChange={handleHostAvatarChange}
          isPrivate={isPrivate}
          isQuickPlay={isQuickPlay}
        />
        </HostLobbyScreen>
      )}

      {/* Pre-Game View — TV lobby (host NOT playing / spectator mode) */}
      {!runtime.gameStarted && !runtime.waitingForResults && !runtime.showStartAnimation && !hasActiveGameData && !settings.hostPlaying && (
        <TvLobbyView
          gameCode={gameCode}
          roomLanguage={state.roomLanguage}
          username={username}
          t={t}
          playersReady={players.playersReady as any}
          readyUsernames={playersReadyData?.readyUsernames ?? []}
          timerValue={settings.timerValue}
          difficulty={settings.difficulty}
          onStartGame={actions.startGame}
          onExitRoom={actions.handleExitRoom}
          tournamentCreating={tournament.tournamentCreating}
          setHostPlaying={state.setHostPlaying}
          onStartSoloDemoWithBots={actions.startSoloDemoWithBots}
          isClassroomMode={isClassroomMode}
          classroomGameMode={resolvedClassroomGameMode}
          // The projector lobby prints the session, not just the code — and the
          // teacher's own sessionStorage copy is the source that exists before
          // the server record does.
          lessonName={lessonData?.lessonName}
          wordCount={lessonData?.vocabularyWords?.length}
          classroomTemplateSettings={lessonData?.templateSettings ?? null}
        />
      )}

      {/* In-Game View - Host Playing */}
      {((runtime.gameStarted || hasActiveGameData) && !runtime.waitingForResults && settings.hostPlaying && runtime.tableData) && (
        <MpRoundScreen>
        <HostInGameView
          gameCode={gameCode}
          username={username}
          roomLanguage={state.roomLanguage}
          t={t}
          tableData={runtime.tableData}
          remainingTime={runtime.remainingTime}
          timerValue={settings.timerValue}
          minWordLength={settings.minWordLength}
          comboLevel={combo.level}
          comboLevelRef={state.comboRefs.levelRef}
          hostPlaying={settings.hostPlaying}
          showStartAnimation={runtime.showStartAnimation}
          hostFoundWords={hostPlayingState.hostFoundWords}
          onWordSubmit={actions.handleHostWordSubmit}
          playersReady={players.playersReady as any}
          playerScores={players.playerScores}
          playerWordCounts={players.playerWordCounts}
          onStopGame={actions.stopGame}
          socket={socket}
          earthquakeState={earthquakeState}
          fireRoundActive={fireRoundActive}
          fireRoundRemaining={fireRoundRemaining}
          boardTheme={state.boardTheme}
          totalTime={settings.timerValue * 60}
        />
        </MpRoundScreen>
      )}
      {projectorShowsQuiz({ gameStarted: !!runtime.gameStarted, hasActiveGameData: !!hasActiveGameData, waitingForResults: !!runtime.waitingForResults, hostPlaying: !!settings.hostPlaying, hasBoard: !!runtime.tableData, isQuizRoom: isVocabQuizRoom }) && (
        <TvBroadcastView
          gameCode={gameCode}
          username={username}
          roomLanguage={state.roomLanguage}
          t={t}
          tableData={runtime.tableData}
          remainingTime={runtime.remainingTime}
          timerValue={settings.timerValue}
          playersReady={players.playersReady as any}
          playerScores={players.playerScores}
          playerWordCounts={players.playerWordCounts}
          socket={socket}
          earthquakeState={earthquakeState}
          fireRoundActive={fireRoundActive}
          fireRoundRemaining={fireRoundRemaining}
          classroomLive={classroomLive}
          lessonWords={lessonData?.vocabularyWords}
          onExitRoom={isClassroomMode ? actions.handleExitRoom : undefined}
          onQuizPlayAgain={() => actions.handleStartNewGame({ gameMode: currentGameMode })} // same rematch as TvResultsView
        />
      )}
    </div>
  );
});

HostView.displayName = 'HostView';

export default HostView;
