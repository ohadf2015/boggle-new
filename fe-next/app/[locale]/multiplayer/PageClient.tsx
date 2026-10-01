'use client';

/**
 * The multiplayer page frame. State lives in `useMpPageState`; the phase view
 * is rendered by `MpPhaseRouter` from the pure `resolveMpPagePhase`. This file
 * owns only what wraps every phase: socket context, connection banners,
 * classroom chrome, teacher controls and the host-left modal. FROZEN after
 * FOUNDATION: pieces change their screens, never this frame.
 */
import React from 'react';
import nextDynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import AutoHideHeader from '@/components/AutoHideHeader';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import { hideClassroomChrome, classroomPanelExpanded } from '@/lib/education/classroomLobbyChrome';
import { ConnectionDot, ConnectionBanner } from '@/components/ConnectionStatusIndicator';
import { ConnectionQualityChip } from '@/components/multiplayer/ConnectionQualityChip';
import SpectatorBanner from '@/components/SpectatorBanner';
import { SocketContext } from '@/utils/SocketContext';
import { clearSessionPreservingUsername } from '@/utils/session';
import { stripMultiplayerExitParams } from '@/lib/multiplayer/stripExitParams';
import { multiplayerExitDestination } from '@/lib/multiplayer/exitDestination';
import { useMpPageState } from './useMpPageState';
import { MpPhaseRouter } from './MpPhaseRouter';
import { MpExitProvider } from '@/hooks/useMpExit';

export { VALID_MODES, applyMpPreselectMode } from './preselectMode';

// Grace modal only appears on a rare host-left socket event, never at lobby first
// paint — lazy-load to keep it out of the multiplayer route's initial parse.
const HostLeftGraceModal = nextDynamic(
  () => import('@/components/multiplayer/HostLeftGraceModal').then((m) => m.HostLeftGraceModal),
  { ssr: false },
);

// Classroom-only chrome (1375 combined lines): every non-classroom multiplayer
// visitor — the vast majority — was parsing all four regardless. None render
// until isClassroomMode/gameActive gates pass below, so lazy-load like the
// grace modal above.
const EducationHeader = nextDynamic(
  () => import('@/components/education/EducationHeader').then((m) => m.EducationHeader),
  { ssr: false },
);
const ClassroomModeBanner = nextDynamic(
  () => import('@/components/education/ClassroomModeBanner').then((m) => m.ClassroomModeBanner),
  { ssr: false },
);
const TeacherLiveControls = nextDynamic(
  () => import('@/components/education/TeacherLiveControls').then((m) => m.TeacherLiveControls),
  { ssr: false },
);
const GamePausedOverlay = nextDynamic(
  () => import('@/components/education/GamePausedOverlay').then((m) => m.GamePausedOverlay),
  { ssr: false },
);
const StudentWordBank = nextDynamic(
  () => import('@/components/education/StudentWordBank').then((m) => m.StudentWordBank),
  { ssr: false },
);

export default function MultiplayerPageClient(): React.JSX.Element {
  const {
    t, language, router, isClassroomMode, isClassroomHost, username, hostUsername, gameCode, prefilledRoomCode,
    isActive, isHost, showResults, gameActive, liveGameMode, playersInRoom, lessonDataState, liveClassroomGame,
    socket, isConnected, isSpectator, spectators, handleUpgradeToPlayer, signalIntentionalLeave,
    isPaused, pauseGame, resumeGame, extendTime, endRoundNow, skipTargetWord,
    classroomAccessibility, classroomLevel, classroomWordBank, teacherStrip, quizOwnsScreen,
    socketContextValue, hostLeftState, setHostLeftState, classroomContext, classroomDecisionRef, exitClassroomStudentToHub,
    handleExitToLobby, exitMp, setIsActive, setIsHost, setIsPrivate, setGameCode, setShowResults, setResultsData,
    routerProps,
  } = useMpPageState();

  return (
    <SocketContext.Provider value={socketContextValue}>
      <MpExitProvider value={exitMp}>
      <ErrorBoundary>
        <div tabIndex={-1} className="flex-1 flex flex-col min-h-0 w-full overflow-x-clip">
          {/* Root fills the flex-fit locked body (which reserves banner height via padding-bottom),
              so the banner never overlaps bottom CTAs / ready indicators. Lobby, results, and
              in-game states all use this single root — MP-root wraps all MP views. */}
          {isActive ? <ConnectionBanner showScoreSafe onLeaveGame={() => {
            signalIntentionalLeave();
            // Tell the server we're leaving and pass username so the schema
            // validates (server still derives identity from the socket map).
            socket?.emit('leaveRoom', { gameCode, username });
            setIsActive(false); setIsHost(false); setIsPrivate(false); setGameCode('');
            // Clear results so a subsequent rejoin doesn't render the prior
            // game's results page for a frame before the socket reconnects.
            setShowResults(false); setResultsData(null);
            // Preserve username so the next join modal pre-fills it; clearing
            // the session removes the room mapping so refresh / restore won't
            // throw the player back into this room.
            clearSessionPreservingUsername(username);
            // Mark intentional exit — tightens the auto-rejoin freshness guard
            // so even a same-second F5 stays on the lobby, not back in-game.
            try { sessionStorage.setItem('boggle_intentional_exit', '1'); } catch { /* blocked */ }
            // Clean the exit-trap params so a back/forward nav doesn't auto-rejoin
            // — and so a classroom host is not dropped back onto
            // `?classroom=true&host=true`, which just makes them another room.
            if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
              window.history.replaceState({}, '', stripMultiplayerExitParams(window.location.href));
            }
            // This is the in-lobby Back button — the exit a teacher actually
            // taps mid-lesson (measured landing on the consumer arcade on
            // 2026-09-15). Same decision as `handleExitToLobby`: stripping says
            // what the room is NOT, this says where the user now is. Both paths
            // have to make it — fixing only one is how they drifted apart.
            const destination = multiplayerExitDestination({
              // Tri-state, not the URL flag: a student who typed a classroom
              // code into the arcade lobby has no flag. A pending record exits
              // as arcade here — user-initiated exits cannot wait (accepted
              // residual; the irreversible socket decisions DO defer).
              isClassroomMode: classroomContext === 'classroom',
              isHost: isHost || isClassroomHost,
              locale: language,
            });
            if (destination) {
              router.push(destination);
              return;
            }
            toast(t('multiplayerFlow.roomList.leftGame'), { icon: '👋' });
          }} /> : <ConnectionDot />}
          <SpectatorBanner isSpectating={isSpectator} onRequestUpgrade={handleUpgradeToPlayer} t={t} spectatorCount={spectators.length} />
          {/* RTT-tier quality signal (degraded/weak) while the socket is still up.
              Gated on isConnected so the full-offline state stays owned solely by
              ConnectionBanner — the chip renders null on a healthy connection. */}
          {isActive && isConnected && (
            <div className="pointer-events-none fixed top-14 end-2 z-40">
              <ConnectionQualityChip />
            </div>
          )}
          {isClassroomMode ? (
            // Gated on `gameActive`, NOT `isActive`: `onJoined` sets `isActive`
            // the moment the host lands in the LOBBY, so the old predicate hid
            // the join code exactly when the teacher needed it on a projector.
            hideClassroomChrome({ gameActive: gameActive || quizOwnsScreen, showResults }) ? null : (
              <>
                <EducationHeader
                  showBackButton
                  title={t('education.classroomGame.title')}
                  // The default `/education` landing is wrong mid-game — send
                  // the host back to the teacher hub and a student back to
                  // their own hub, same decision every other exit path here
                  // makes via multiplayerExitDestination (education
                  // homepage-bounce audit).
                  backHref={
                    multiplayerExitDestination({
                      isClassroomMode,
                      isHost: isHost || isClassroomHost,
                      locale: language,
                    }) || `/${language}/education`
                  }
                />
                <ClassroomModeBanner
                  lessonData={lessonDataState}
                  gameCode={gameCode || prefilledRoomCode}
                  expanded={classroomPanelExpanded({ gameActive })}
                  // `isHost` only flips once the server answers `joined`, and the
                  // teacher arrives on `?host=true` — without the URL flag their
                  // own share code would blink out of existence on every reload.
                  isHost={isHost || isClassroomHost}
                  liveGame={liveClassroomGame}
                />
              </>
            )
          ) : (
            // AutoHideHeader manages visibility via isInGame (= isActive || showResults):
            // room list → full header; room lobby/gameplay/results → header hidden.
            // 'user-initiated' keeps the spacer for the reconnect flip (CLS 0.979
            // when it collapsed inside the measurement window) and drops it when
            // the user tapped into the room, where the shift is input-excluded.
            <AutoHideHeader collapseSpacerWhenHidden="user-initiated" />
          )}
          {/* SPED large-text accommodation: the teacher's support preset rides
              the startGame payload; zoom scales the whole play surface (grid,
              word input, word bank) without touching per-component font sizes. */}
          <div className="flex-1 flex flex-col min-h-0" style={classroomAccessibility?.largeText ? { zoom: 1.2 } : undefined}>
            <MpPhaseRouter {...routerProps} />
          </div>
          {/* Teacher live controls (classroom rooms). Overlay for everyone while
              paused; the floating bar only for the host. Both gated on a live
              round so a stale flag can never surface on lobby/results. */}
          {isActive && gameActive && !showResults && isPaused && (
            <GamePausedOverlay isHost={isHost} />
          )}
          {/* Differentiation scaffold: a word bank for support-level students, a
              longer-word target for challenge-level ones, nothing for everyone
              else — the component decides, so the mount is unconditional. */}
          {isActive && gameActive && !showResults && (
            <StudentWordBank level={classroomLevel} words={classroomWordBank} />
          )}
          {teacherStrip.visible && (
            <TeacherLiveControls
              isPaused={isPaused || teacherStrip.quizPaused} gameMode={liveGameMode} isQuizRound={teacherStrip.quizRound}
              onPause={pauseGame} onResume={resumeGame} onExtendTime={extendTime}
              onEndRound={endRoundNow} onSkipWord={skipTargetWord}
              students={playersInRoom} hostUsername={hostUsername || username} socket={socket}
            />
          )}
          <HostLeftGraceModal
            isOpen={!!hostLeftState}
            seconds={10}
            reason={hostLeftState?.reason}
            onExit={() => {
              // Same native-safe in-place reset as the results "Exit" button,
              // then clear the grace modal — except for a classroom student,
              // whose "back to the lobby" is the student hub, not the arcade.
              // Pessimistic while the record is pending: only a definitive
              // arcade context routes to the consumer lobby.
              const { context, isHost: hostNow } = classroomDecisionRef.current;
              if (!hostNow && context !== 'arcade') {
                exitClassroomStudentToHub();
              } else {
                handleExitToLobby();
              }
              setHostLeftState(null);
            }}
          />
        </div>
      </ErrorBoundary>
      </MpExitProvider>
    </SocketContext.Provider>
  );
}
