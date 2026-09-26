'use client';

/**
 * PlayerView — the joiner's phase router. All state and effects live in
 * `usePlayerPhase` (+ usePendingGameStart); this file only picks what to show:
 * loading, waiting room, "tallying the scores", or the round with its
 * mode-reveal / countdown overlays. Views render inside their piece's screen
 * stub (PlayerLobbyScreen, MpRoundScreen, MpCountdown). FROZEN after FOUNDATION.
 */
import React, { memo } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import PlayerWaitingView from './components/PlayerWaitingView';
import PlayerInGameView from './components/PlayerInGameView';
import FirstTimeAchievement from '../components/game/FirstTimeAchievement';
import ModeRevealOverlay from '@/components/game/ModeRevealOverlay';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Loader2 } from 'lucide-react';
import { sendCountdownComplete, consumeStashedMessageId } from '@/shared/utils/gameEventUtils';
import { useBoardWaitingScreen } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import { PlayerLobbyScreen } from '@/components/multiplayer/lobby/PlayerLobbyScreen';
import { MpRoundScreen } from '@/components/multiplayer/round/MpRoundScreen';
import { MpCountdown } from '@/components/multiplayer/round/MpCountdown';
import { usePlayerPhase } from './hooks/usePlayerPhase';
import type { PlayerViewProps } from './types';

const PlayerView: React.FC<PlayerViewProps> = memo((props) => {
  const { username, gameCode, seriesRoundNumber, isClassroomMode, classroomGameMode } = props;
  const {
    t, dir, socket, waitingForResults, letterGrid, remainingTime, gameActive, showModeReveal, showStartAnimation,
    dispatchReveal, setShowStartAnimation, pendingMessageIdRef, isGameLoading, resolvedGameLanguage, playersReady,
    showQR, setShowQR, showExitConfirm, setShowExitConfirm, handleExitRoom, confirmExitRoom, handleNameChange,
    handleAvatarChange, readyUsernames, isReady, toggleReady, readyInFlight, leaderboard, foundWords, gameMode,
    coachMode, isNewPlayerRef, pendingAchievement, clearAchievement, shufflingGrid, minWordLength, comboLevel,
    comboLevelRef, lastWordTime, mappedFoundWords, totalBoardWords, tournamentData, tournamentStandings,
    showTournamentStandings, setShowTournamentStandings, handleWordSubmit, handleResetCombo, hints, earthquakeState,
    fireRoundActive, fireRoundRemaining, boardTheme, totalGameTimeRef,
  } = usePlayerPhase(props);
  const boardWaiting = useBoardWaitingScreen(socket, waitingForResults); // a quiz room has no board clock

  // Show game board during countdown animation when we have letterGrid
  // This allows players to see the board while countdown is active
  // Also covers the transition period between countdown ending and gameActive being set
  const hasGameData = letterGrid && remainingTime !== null && remainingTime > 0;
  const showGameView = gameActive || (hasGameData && !boardWaiting);

  // Map game mode to display label
  const modeRevealLabel = gameMode === 'blast' ? t('countdown.modeReveal.blast') : gameMode === 'word-hunt' ? t('countdown.modeReveal.wordHunt') : gameMode === 'wheel-rush' ? t('countdown.modeReveal.wheelRush') : t('countdown.modeReveal.classic');

  // The mode-reveal / countdown sequence always routes through the main
  // in-game-view return below, so GoRipplesAnimation (and ModeRevealOverlay)
  // mount from exactly one tree position — no unmount/remount that would
  // restart the countdown from 3.
  if (!showGameView && !boardWaiting && !showModeReveal && !showStartAnimation) {
    // Show loading indicator when server is preparing the game
    if (isGameLoading) {
      return (
        <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-neo-lime animate-spin" />
            <div className="text-lg font-bold text-white/70">
              {t('common.preparingGame')}
            </div>
          </div>
        </div>
      );
    }

    return (
      <PlayerLobbyScreen>
      <PlayerWaitingView
          gameCode={gameCode}
          gameLanguage={resolvedGameLanguage}
          username={username}
          t={t}
          playersReady={playersReady}
          showQR={showQR}
          setShowQR={setShowQR}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
          onNameChange={handleNameChange}
          onAvatarChange={handleAvatarChange}
          readyUsernames={readyUsernames}
          isReady={isReady}
          onToggleReady={toggleReady}
          readyInFlight={readyInFlight}
          isClassroomMode={isClassroomMode}
          classroomGameMode={classroomGameMode}
        />
      </PlayerLobbyScreen>
    );
  }

  // Waiting for results — brief transition until scores arrive (no validation modal)
  if (boardWaiting) {
    const playerEntry = leaderboard.find(p => p.username === username);
    const playerScore = playerEntry?.score ?? 0;
    const validWords = foundWords.filter(w => w.validated !== false);

    return (
      <div className="flex-1 w-full bg-neo-navy flex items-center justify-center">
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center gap-4 text-center px-6"
        >
          <div className="border-3 border-neo-black rounded-neo shadow-hard px-6 py-4 bg-linear-to-br from-neo-yellow to-neo-orange">
            <div className="font-black text-neo-black text-3xl tabular-nums">
              {playerScore.toLocaleString()}
            </div>
            <div className="font-bold uppercase tracking-wider text-neo-black/60 text-xs">
              {t('common.score')}
            </div>
          </div>
          <div className="text-white/60 font-bold text-sm">
            {validWords.length} {t('common.words')}
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('game.calculatingResults')}</span>
          </div>
        </AdaptiveMotion.div>
      </div>
    );
  }

  return (
    <>
      {showModeReveal && (
        <ModeRevealOverlay
          modeLabel={modeRevealLabel}
          seriesRoundNumber={seriesRoundNumber}
          t={t}
          onIntroDismiss={() => dispatchReveal({ type: 'endReveal' })}
        />
      )}
      {coachMode && <ModeCoach mode={coachMode} />}
      {showStartAnimation && (
        <MpCountdown>
        <GoRipplesAnimation
          onComplete={() => {
            setShowStartAnimation(false);
            const id = pendingMessageIdRef.current ?? consumeStashedMessageId('PLAYER');
            pendingMessageIdRef.current = null;
            if (socket) sendCountdownComplete(socket, id, 'PLAYER');
          }}
          t={t}
          players={playersReady}
        />
        </MpCountdown>
      )}
      {/* First-time achievement celebrations for new players */}
      {isNewPlayerRef.current && (
        <FirstTimeAchievement
          achievementType={pendingAchievement}
          onDismiss={clearAchievement}
          position="top"
        />
      )}

      <MpRoundScreen>
      <PlayerInGameView
        username={username}
        gameCode={gameCode}
        t={t}
        dir={dir}
        socket={socket}
        letterGrid={letterGrid}
        shufflingGrid={shufflingGrid}
        gameActive={gameActive}
        showStartAnimation={showModeReveal || showStartAnimation}
        remainingTime={remainingTime}
        gameLanguage={resolvedGameLanguage}
        minWordLength={minWordLength}
        comboLevel={comboLevel}
        comboLevelRef={comboLevelRef}
        lastWordTime={lastWordTime}
        foundWords={mappedFoundWords}
        leaderboard={leaderboard}
        rosterUsers={playersReady}
        totalBoardWords={totalBoardWords}
        tournamentData={tournamentData}
        tournamentStandings={tournamentStandings}
        showTournamentStandings={showTournamentStandings}
        setShowTournamentStandings={setShowTournamentStandings}
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        onExitRoom={handleExitRoom}
        onConfirmExit={confirmExitRoom}
        onWordSubmit={handleWordSubmit}
        onResetCombo={handleResetCombo}
        hints={hints}
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        boardTheme={boardTheme}
        totalTime={totalGameTimeRef.current}
      />
      </MpRoundScreen>
    </>
  );
});

PlayerView.displayName = 'PlayerView';

export default PlayerView;
