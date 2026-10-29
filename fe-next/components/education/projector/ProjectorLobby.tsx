'use client';

import { memo } from 'react';
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
import { ProjectorStartBar } from './ProjectorStartBar';
import { useProjectorLobbyMode } from './useProjectorLobbyMode';

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
}

const BRAND = 'LexiClash';
const LOBBY_BG = '/images/education/v2/live-lobby-bg.webp';
const CHIP = 'inline-flex min-w-0 items-center gap-[0.4em] rounded-full border-[3px] px-[0.8em] py-[0.2em] font-neo-display font-black shadow-hard-sm';

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
}) {
  const lobby = useProjectorLobbyMode({ gameCode, classroomGameMode, templateSettings, t });
  const { kick, statusOf } = useKickStudent(getSharedSocketIfExists());
  const studentCount = realStudentCount(students);
  const delay = useEnterStyle();
  const lesson = lessonName || lobby.lessonNames.join(' · ');

  return (
    <div data-testid="projector-lobby" className="fixed inset-0 z-[65] overflow-hidden bg-neo-navy [container-type:size]">
      <style>{LIVE_KEYFRAMES}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed art, eager */}
      <img data-testid="projector-arena-art" src={LOBBY_BG} alt="" aria-hidden="true" loading="eager" decoding="async" className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-neo-navy/35" />

      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div className="grid min-h-full grid-cols-1 content-start gap-[clamp(0.75rem,1.4cqw,2rem)] p-4 @5xl:p-[clamp(1rem,2cqw,3rem)] @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @5xl:grid-rows-[auto_minmax(min-content,1fr)_auto] @5xl:content-stretch">
          <header
            data-testid="projector-session"
            style={delay(0)}
            className={cn('flex flex-wrap items-center gap-[clamp(0.5rem,1cqw,1.25rem)] text-[clamp(1rem,min(1.3cqw,2.4cqh),2rem)] @5xl:col-span-2', RISE)}
          >
            {onExitRoom && (
              <button
                type="button"
                data-testid="projector-exit"
                onClick={onExitRoom}
                aria-label={t('eduLiveRoom.lobby.leave')}
                title={t('eduLiveRoom.lobby.leave')}
                className={cn('grid size-11 shrink-0 place-items-center rounded-neo border-[3px] border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard-sm hover:bg-neo-navy', PRESS)}
              >
                <DirectionalIcon icon={ArrowLeft} className="size-5" />
              </button>
            )}
            <p className="whitespace-nowrap font-neo-display text-[1.7em] font-black leading-none text-neo-white [-webkit-text-stroke:2px_rgb(var(--neo-black))] [paint-order:stroke_fill]">
              {BRAND}
              <span className="ms-2 inline-block -rotate-3 rounded-neo border-[3px] border-neo-black bg-neo-purple px-3 py-0.5 align-middle text-[0.6em] text-neo-cream shadow-hard-sm [-webkit-text-stroke:0]">
                {t('eduLiveRoom.lobby.brand')}
              </span>
            </p>
            <span className={cn(CHIP, 'ms-auto max-w-full border-neo-black bg-neo-cyan text-neo-black')}>
              <GraduationCap className="size-[1em] shrink-0" aria-hidden="true" />
              <span dir="auto" className="truncate">{lobby.className || t('education.classroomGame.classroomSession')}</span>
            </span>
            {lesson && (
              <span className={cn(CHIP, 'max-w-full border-neo-cream bg-neo-navy/90 text-neo-cream')}>
                <BookOpen className="size-[1em] shrink-0" aria-hidden="true" />
                <span dir="auto" className="truncate">{lesson}</span>
                {wordCount > 0 && <span className="shrink-0 font-neo-body font-bold text-neo-cream/75">· {t('education.classroomGame.words', { count: wordCount })}</span>}
              </span>
            )}
          </header>

          <div style={delay(1)} className={cn('@5xl:row-start-2 @5xl:min-h-0', RISE)}>
            <ProjectorJoinPanel gameCode={gameCode} language={language} baseUrl={baseUrl} t={t} waiting={students.length === 0} />
          </div>

          <div style={delay(2)} className={cn('flex min-h-[16rem] flex-col @5xl:row-start-2 @5xl:min-h-0', RISE)}>
            <ProjectorRoster students={students} readyUsernames={readyUsernames} t={t} onRemove={kick} removeStatusOf={statusOf} />
          </div>

          <ProjectorModeCard gameCode={gameCode} lobby={lobby} t={t} style={delay(3)} className="@5xl:row-start-3" />

          <ProjectorStartBar
            gameCode={gameCode}
            language={language}
            baseUrl={baseUrl}
            t={t}
            lobby={lobby}
            studentCount={studentCount}
            startLabelKey={startLabelKey}
            starting={starting}
            onStartGame={onStartGame}
            autoStartSecondsLeft={autoStartSecondsLeft}
            onCancelAutoStart={onCancelAutoStart}
            onStartPracticeRound={onStartPracticeRound}
            practiceRoundPending={practiceRoundPending}
            practiceRoundFailed={practiceRoundFailed}
            style={delay(4)}
            className="@5xl:row-start-3"
          />
        </div>
      </div>
    </div>
  );
});

export default ProjectorLobby;
