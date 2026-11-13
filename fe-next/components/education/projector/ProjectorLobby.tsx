'use client';

import { trackEduStartedWhileLearning } from '@/lib/education/studyTelemetry';
import { memo, useCallback } from 'react';
import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { realStudentCount } from '@/lib/education/rehearsal';
import { useKickStudent } from '@/hooks/useKickStudent';
import { LIVE_KEYFRAMES, PRESS, RISE, useEnterStyle } from '@/components/education/live/eduLiveStyles';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import ProjectorJoinPanel from './ProjectorJoinPanel';
import ProjectorRoster, { type ProjectorStudent } from './ProjectorRoster';
import { ProjectorModeCard } from './ProjectorModeCard';
import { ProjectorStartBar, type LessonWordsBlock } from './ProjectorStartBar';
import { ProjectorWordPanel } from './ProjectorWordPanel';
import { studentsNotReady } from './projectorLobbyModel';
import { ProjectorLobbyLock } from './ProjectorLobbyLock';
import { useProjectorLobbyMode } from './useProjectorLobbyMode';
import { useProjectorClassCode } from './useProjectorClassCode';
import { WALL_SQUARE, WALL_STICKER } from './projectorNbStyles';
import { markRoomPlayed, roomPlayed } from './roomPlayed';
import { EduPhoneTestPrompt } from '@/components/education/live/EduPhoneTestPrompt';
import { EDU_MASCOT } from '@/lib/education/mascotArt';

export interface ProjectorLobbyProps {
  gameCode: string;
  language: string;
  baseUrl?: string;
  /** Host already stripped upstream: the projector shows the class, not the teacher. */
  students: ProjectorStudent[];
  readyUsernames?: string[];
  t: (path: string, params?: Record<string, string | number>) => string;
  onStartGame: () => void;
  /** The projector covers the page header, so it owns the way out. */
  onExitRoom?: () => void;
  /** `hostView.startQuiz` / `hostView.startClassGame`: the teacher's own register. */
  startLabelKey: string;
  starting?: boolean;
  lessonName?: string;
  wordCount?: number;
  classroomGameMode?: ClassroomGameMode;
  /** The teacher's own copy of the settings (sessionStorage): there at mount, while the room record 404s until Redis has it. */
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
  autoStartSecondsLeft?: number | null;
  onCancelAutoStart?: () => void;
  onStartPracticeRound?: () => void;
  practiceRoundPending?: boolean;
  practiceRoundFailed?: boolean;
  /** Message for the failure: the server's refusal reason, or the generic connection line. */
  practiceRoundFailedKey?: string;
  lessonWordsBlock?: LessonWordsBlock;
}

const CHIP = cn(WALL_STICKER, '@5xl:px-[0.8em]');

/**
 * The classroom lobby on the wall and on the teacher's own screen. The root is a size container, so every
 * size is relative to the frame it renders in (full screen, a preview, a sheet), never the viewport.
 * Dark-only by construction: the cream/dark pair flashes cream on a lazy mount.
 */
export const ProjectorLobby = memo<ProjectorLobbyProps>(function ProjectorLobby({
  gameCode,
  language,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live',
  students,
  readyUsernames = [],
  t,
  onStartGame,
  onExitRoom,
  startLabelKey,
  starting = false,
  lessonName,
  wordCount = 0,
  classroomGameMode,
  templateSettings = null,
  autoStartSecondsLeft = null,
  onCancelAutoStart,
  onStartPracticeRound,
  practiceRoundPending = false,
  practiceRoundFailed = false,
  practiceRoundFailedKey,
  lessonWordsBlock,
}) {
  const lobby = useProjectorLobbyMode({ gameCode, classroomGameMode, templateSettings, t });
  const classCode = useProjectorClassCode(lobby.classroomId);
  const { kick, statusOf } = useKickStudent(getSharedSocketIfExists());
  const present = students.filter((s) => !s.reconnecting);
  const studentCount = realStudentCount(present);
  // Lesson words mean students study them before READY unlocks, so READY now means "learned".
  const stillLearning = Math.max(wordCount, lobby.studyWordCount) > 0 ? studentsNotReady(present, readyUsernames).length : 0;
  const delay = useEnterStyle();
  const lesson = lessonName || lobby.lessonNames.join(' · ');
  // Read every render, not once: the lobby may stay mounted under the results layer between rounds.
  const canChangeMode = roomPlayed(gameCode);
  const hasWords = lobby.studyCards.length > 0;
  const startGame = useCallback(() => {
    markRoomPlayed(gameCode);
    if (stillLearning > 0) trackEduStartedWhileLearning({ stillLearning, students: studentCount });
    onStartGame();
  }, [gameCode, onStartGame, stillLearning, studentCount]);
  const startPractice = useCallback(() => {
    markRoomPlayed(gameCode);
    onStartPracticeRound?.();
  }, [gameCode, onStartPracticeRound]);

  return (
    <div data-testid="projector-lobby" className="fixed inset-0 z-[65] overflow-hidden bg-neo-navy [container-type:size]">
      <style>{LIVE_KEYFRAMES}</style>

      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div
          className={cn(
            'grid min-h-full grid-cols-1 content-start gap-3 p-3 @5xl:gap-[clamp(0.75rem,1.4cqw,2rem)] @5xl:p-[clamp(1rem,2cqw,3rem)] @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @5xl:content-stretch',
            hasWords ? '@5xl:grid-rows-[auto_minmax(min-content,1fr)_auto_auto]' : '@5xl:grid-rows-[auto_minmax(min-content,1fr)_auto]'
          )}
        >
          <header
            data-testid="projector-session"
            style={delay(0)}
            className={cn('flex flex-wrap items-center gap-x-[clamp(0.5rem,1cqw,1.25rem)] gap-y-2 pe-12 text-[clamp(0.9375rem,min(1.3cqw,2.4cqh),2rem)] @5xl:col-span-2', RISE)}
          >
            {onExitRoom && (
              <button
                type="button"
                data-testid="projector-exit"
                onClick={onExitRoom}
                aria-label={t('eduLiveRoom.lobby.leave')}
                title={t('eduLiveRoom.lobby.leave')}
                className={cn(WALL_SQUARE, PRESS)}
              >
                <DirectionalIcon icon={ArrowLeft} className="size-5" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
            <img src={EDU_MASCOT.welcome} alt="" aria-hidden="true" className="size-[2.6em] shrink-0 select-none drop-shadow-[3px_3px_0_rgb(var(--neo-black))] @max-5xl:hidden motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite]" />
            <h1 className="whitespace-nowrap font-neo-display text-[1.6em] font-black leading-none text-neo-cream @max-5xl:text-[1.25em]">
              {t('eduLiveRoom.lobby.joinTitle')}
            </h1>
            <span data-testid="projector-session-chip" className={CHIP}>
              <GraduationCap className="size-[1em] shrink-0 @max-5xl:hidden" aria-hidden="true" />
              <span dir="auto" className="truncate">{lobby.className || t('education.classroomGame.classroomSession')}</span>
            </span>
            {lesson && (
              <span data-testid="projector-session-chip" className={CHIP}>
                <BookOpen className="size-[1em] shrink-0 @max-5xl:hidden" aria-hidden="true" />
                <span dir="auto" className="min-w-0 break-words">{lesson}</span>
                {wordCount > 0 && <span className="shrink-0 font-neo-body font-bold text-neo-cream/75 @max-5xl:hidden">· {t('education.classroomGame.words', { count: wordCount })}</span>}
              </span>
            )}
            {/* The padlock sits up here with the room's name, out of the Start row: Start is the one thing to press. */}
            <ProjectorLobbyLock gameCode={gameCode} t={t} className="ms-auto shrink-0" />
          </header>

          <div style={delay(1)} className={cn('@5xl:row-start-2 @5xl:min-h-0', RISE)}>
            <ProjectorJoinPanel key={classCode ?? gameCode} gameCode={gameCode} classCode={classCode} language={language} baseUrl={baseUrl} t={t} waiting={students.length === 0} compact={hasWords} />
          </div>

          <div style={delay(2)} className={cn('flex flex-col @5xl:row-start-2 @5xl:min-h-0', RISE)}>
            <ProjectorRoster
              students={students}
              readyUsernames={readyUsernames}
              t={t}
              onRemove={kick}
              removeStatusOf={statusOf}
              emptyActions={<div className="@max-3xl:hidden"><EduPhoneTestPrompt gameCode={gameCode} language={language} baseUrl={baseUrl} mode={lobby.mode} t={t} /></div>}
            />
          </div>

          {hasWords && <ProjectorWordPanel cards={lobby.studyCards} t={t} style={delay(3)} className="@5xl:col-span-2 @5xl:row-start-3" />}

          <ProjectorModeCard gameCode={gameCode} lobby={lobby} t={t} canChange={canChangeMode} style={delay(3)} className={hasWords ? '@5xl:row-start-4' : '@5xl:row-start-3'} />

          <ProjectorStartBar
            gameCode={gameCode}
            t={t}
            lobby={lobby}
            studentCount={studentCount}
            stillLearning={stillLearning}
            startLabelKey={startLabelKey}
            starting={starting}
            onStartGame={startGame}
            autoStartSecondsLeft={autoStartSecondsLeft}
            onCancelAutoStart={onCancelAutoStart}
            onStartPracticeRound={onStartPracticeRound ? startPractice : undefined}
            practiceRoundPending={practiceRoundPending}
            practiceRoundFailed={practiceRoundFailed}
            practiceRoundFailedKey={practiceRoundFailedKey}
            lessonWordsBlock={lessonWordsBlock}
            style={delay(4)}
            className={hasWords ? '@5xl:row-start-4' : '@5xl:row-start-3'}
          />
        </div>
      </div>
    </div>
  );
});

export default ProjectorLobby;
