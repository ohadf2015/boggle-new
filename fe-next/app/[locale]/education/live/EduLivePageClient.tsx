'use client';

/** State is the shared useMpPageState; this frame owns only the classroom chrome around the phases. */
import React from 'react';
import nextDynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import { ConnectionDot, ConnectionBanner } from '@/components/ConnectionStatusIndicator';
import { ConnectionQualityChip } from '@/components/multiplayer/ConnectionQualityChip';
import { SocketContext } from '@/utils/SocketContext';
import { MpExitProvider } from '@/hooks/useMpExit';
import { classroomStudentHomePath, CLASSROOM_ROOM_GONE_KEY } from '@/lib/education/classroomRoomGone';
import { useMpPageState } from '@/app/[locale]/multiplayer/useMpPageState';
import { EduLivePhaseRouter } from './EduLivePhaseRouter';

const HostLeftGraceModal = nextDynamic(
  () => import('@/components/multiplayer/HostLeftGraceModal').then((m) => m.HostLeftGraceModal),
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
const ExitConfirmDialog = nextDynamic(() => import('@/host/components/HostDialogs').then((m) => m.ExitConfirmDialog), { ssr: false });
const ClassroomGameEndedState = nextDynamic(
  () => import('@/components/education/ClassroomGameEndedState').then((m) => m.ClassroomGameEndedState),
  { ssr: false },
);
const StudentWordBank = nextDynamic(() => import('@/components/education/StudentWordBank').then((m) => m.StudentWordBank), { ssr: false });

/** The URL names the room the teacher just launched, so a stale "I left" flag from the last room must not swallow it. */
function useClearStaleExitFlag(): void {
  React.useState(() => {
    try { sessionStorage.removeItem('boggle_intentional_exit'); } catch { /* storage blocked or SSR */ }
    return null;
  });
}

export default function EduLivePageClient(): React.JSX.Element {
  useClearStaleExitFlag();
  const urlRoom = useSearchParams()?.get('room') ?? null;
  const s = useMpPageState();
  const [hostExitOpen, setHostExitOpen] = React.useState(false);
  const isTeacher = s.isHost || s.isClassroomHost;

  const leaveFromBanner = () => {
    if (isTeacher) {
      setHostExitOpen(true);
      return;
    }
    s.signalIntentionalLeave();
    s.exitMp('leave-room');
  };

  return (
    <SocketContext.Provider value={s.socketContextValue}>
      <MpExitProvider value={s.exitMp}>
        <ErrorBoundary>
          <div data-testid="edu-live-root" tabIndex={-1} className="flex w-full min-h-0 flex-1 flex-col overflow-x-clip bg-neo-navy">
            {s.isActive ? <ConnectionBanner showScoreSafe onLeaveGame={leaveFromBanner} /> : <ConnectionDot />}
            {s.isActive && s.isConnected && (
              <div className="pointer-events-none fixed end-2 top-14 z-40">
                <ConnectionQualityChip />
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col" style={s.classroomAccessibility?.largeText ? { zoom: 1.2 } : undefined}>
              <EduLivePhaseRouter
                routerProps={s.routerProps}
                urlRoom={urlRoom || s.gameCode || null}
                isTeacher={isTeacher}
                language={s.language}
                t={s.t as (key: string, params?: Record<string, string | number>) => string}
              />
            </div>
            {s.isActive && s.gameActive && !s.showResults && s.isPaused && <GamePausedOverlay isHost={s.isHost} />}
            {s.isActive && s.gameActive && !s.showResults && <StudentWordBank level={s.classroomLevel} words={s.classroomWordBank} />}
            {s.teacherStrip.visible && (
              <TeacherLiveControls
                isPaused={s.isPaused || s.teacherStrip.quizPaused} gameMode={s.liveGameMode} isQuizRound={s.teacherStrip.quizRound}
                onPause={s.pauseGame} onResume={s.resumeGame} onExtendTime={s.extendTime}
                onEndRound={s.endRoundNow} onSkipWord={s.skipTargetWord}
                students={s.playersInRoom} hostUsername={s.hostUsername || s.username} socket={s.socket}
              />
            )}
            {isTeacher && (
              <ExitConfirmDialog open={hostExitOpen} onOpenChange={setHostExitOpen} onConfirm={s.handleExitToLobby} t={s.t} classroom />
            )}
            <HostLeftGraceModal
              isOpen={!!s.hostLeftState}
              seconds={10}
              reason={s.hostLeftState?.reason}
              onExit={() => {
                if (s.classroomDecisionRef.current.isHost) s.handleExitToLobby();
                else s.exitClassroomStudentToHub();
                s.setHostLeftState(null);
              }}
            />
            {s.classroomEnded !== null && (
              <ClassroomGameEndedState
                roomCode={s.classroomEnded}
                message={s.t(CLASSROOM_ROOM_GONE_KEY)}
                hubHref={classroomStudentHomePath(s.language)}
                onRetry={s.retryClassroomRoom}
              />
            )}
          </div>
        </ErrorBoundary>
      </MpExitProvider>
    </SocketContext.Provider>
  );
}
