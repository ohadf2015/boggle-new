'use client';

import { memo, useMemo } from 'react';
import { ArrowLeft, BookOpen, Clock, GraduationCap, Grid3x3, Play, UserPlus, Zap } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { useLiveClassroomGameInfo } from '@/hooks/useLiveClassroomGameInfo';
import { boardSizeLabel, classroomModeLabelKey } from '@/components/education/classroomModeLabels';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import ProjectorJoinPanel from './ProjectorJoinPanel';
import ProjectorRoster, { type ProjectorStudent } from './ProjectorRoster';
import { canStartProjectorRound } from './projectorLobbyModel';

interface ProjectorLobbyProps {
  gameCode: string;
  language: string;
  baseUrl?: string;
  /** Host already stripped upstream — the projector shows the class, not the teacher. */
  students: ProjectorStudent[];
  readyUsernames?: string[];
  t: (path: string, params?: Record<string, string | number>) => string;
  onStartGame: () => void;
  /** Leave the room. The projector covers the page header, so it owns the way out. */
  onExitRoom?: () => void;
  /** `hostView.startQuiz` / `hostView.startClassGame` — the teacher's own register. */
  startLabelKey: string;
  starting?: boolean;
  lessonName?: string;
  wordCount?: number;
  classroomGameMode?: ClassroomGameMode;
  /**
   * The teacher's OWN copy of the settings, straight from `lessonGameData` in
   * sessionStorage. It exists the instant the lobby mounts; the server record
   * 404s until Redis has the room. Same precedence the banner used: local
   * first, server as the fallback — never a default dressed up as an answer.
   */
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

/**
 * ProjectorLobby — the single classroom lobby surface.
 *
 * WHAT THIS REPLACES: a classroom host used to get two join surfaces stacked on
 * one screen — `ClassroomModeBanner`'s expanded panel (code + QR + copy) and
 * `TvJoinBar` inside `TvLobbyView` (code + QR + address), each with its own
 * size, colour and wording. The banner now stands down for a host in the lobby
 * (see ClassroomModeBanner) and everything it carried — class name, lesson,
 * word count, mode, timer, board size, late join — is printed here instead, so
 * the collapse loses nothing.
 *
 * Dark-only by construction: `bg-neo-navy` is hardcoded, never the
 * `bg-neo-cream dark:bg-neo-navy` pair, which flashes cream on a lazy mount
 * (recurring pitfall class 5) — a cream strobe across a classroom wall.
 *
 * The same component is the teacher's phone/laptop view, because the projector
 * usually IS the teacher's mirrored screen: every size is `vw`-based with a
 * mobile step, and the layout stacks under `md`.
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
  // The server's own record of the room. The teacher's sessionStorage knows the
  // lesson; only this knows the CLASS's name. One fetch per code, and a failure
  // costs a label, never the lobby.
  const liveGame = useLiveClassroomGameInfo(gameCode, true);

  const canStart = canStartProjectorRound(students.length);
  const mode: ClassroomGameMode = classroomGameMode ?? liveGame?.gameMode ?? 'classic';
  const isQuiz = mode === VOCAB_QUIZ_MODE;
  const settings = liveGame?.settings ?? null;

  const sessionName = liveGame?.classroomName || t('education.classroomGame.classroomSession');
  const resolvedLessonName = lessonName || (liveGame?.lessonNames ?? []).join(' · ');

  const timerMinutes = templateSettings
    ? Math.round(templateSettings.timerSeconds / 60)
    : settings?.timerMinutes ?? null;
  const boardSize = templateSettings?.difficulty ?? settings?.boardSize ?? undefined;
  const allowLateJoin = templateSettings?.allowLateJoin ?? settings?.allowLateJoin ?? true;

  const facts = useMemo(() => {
    const rows: { key: string; icon: React.ReactNode; text: string }[] = [
      {
        key: 'mode',
        icon: <Zap className="h-[1em] w-[1em]" aria-hidden="true" />,
        text: t(classroomModeLabelKey(mode)),
      },
    ];
    // A quiz has no grid and no round clock — printing a board size and
    // "3 minutes" beside it describes a game nobody in the room is playing.
    if (isQuiz) {
      if (settings?.vocabQuizQuestionCount != null) {
        rows.push({
          key: 'questions',
          icon: <Grid3x3 className="h-[1em] w-[1em]" aria-hidden="true" />,
          text: `${settings.vocabQuizQuestionCount} · ${t('education.classroomGame.questions')}`,
        });
      }
      if (settings?.vocabQuizSeconds != null) {
        rows.push({
          key: 'seconds',
          icon: <Clock className="h-[1em] w-[1em]" aria-hidden="true" />,
          text: t('vocabQuiz.setup.seconds', { seconds: settings.vocabQuizSeconds }),
        });
      }
    } else {
      if (timerMinutes != null) {
        rows.push({
          key: 'timer',
          icon: <Clock className="h-[1em] w-[1em]" aria-hidden="true" />,
          text: `${timerMinutes} ${t('common.minutes')}`,
        });
      }
      rows.push({
        key: 'board',
        icon: <Grid3x3 className="h-[1em] w-[1em]" aria-hidden="true" />,
        text: boardSizeLabel(boardSize),
      });
    }
    rows.push({
      key: 'late',
      icon: <UserPlus className="h-[1em] w-[1em]" aria-hidden="true" />,
      text: allowLateJoin
        ? t('education.projectorLobby.lateJoinOn')
        : t('education.projectorLobby.lateJoinOff'),
    });
    return rows;
  }, [allowLateJoin, boardSize, isQuiz, mode, settings, t, timerMinutes]);

  return (
    <div
      data-testid="projector-lobby"
      className={cn(
        // Full-screen by construction: the lobby OWNS the viewport rather than
        // sitting under the page header with its Start button below the fold —
        // a teacher must never scroll a projector to find the way to begin.
        // z-[65] clears EducationHeader's z-[60]; toasts sit far above both.
        'fixed inset-0 z-[65] flex flex-col gap-[1vw] overflow-hidden',
        'bg-neo-navy px-[2.5vw] py-[1.2vw]'
      )}
    >
      {/* Who this room belongs to. Replaces the banner strip for the host. */}
      <header
        data-testid="projector-session"
        className="flex shrink-0 flex-wrap items-center gap-x-[1.2vw] gap-y-2 font-neo-body"
      >
        {onExitRoom && (
          <button
            type="button"
            data-testid="projector-exit"
            onClick={onExitRoom}
            aria-label={t('common.back')}
            className="shrink-0 rounded-neo border-3 border-neo-cream/30 p-2 text-neo-cream/70 transition-colors hover:border-neo-cream hover:text-neo-cream"
          >
            <DirectionalIcon icon={ArrowLeft} className="h-5 w-5" />
          </button>
        )}
        <span className="inline-flex items-center gap-2 rounded-full border-3 border-neo-cyan bg-neo-cyan/15 px-[1.2vw] py-[0.4vw] text-[3vw] font-black uppercase tracking-wider text-neo-cyan md:text-[1.15vw]">
          <GraduationCap className="h-[1em] w-[1em]" aria-hidden="true" />
          {sessionName}
        </span>
        {resolvedLessonName && (
          <span className="inline-flex min-w-0 items-center gap-2 text-[3vw] font-bold text-neo-cream md:text-[1.15vw]">
            <BookOpen className="h-[1em] w-[1em] shrink-0" aria-hidden="true" />
            <span className="truncate">{resolvedLessonName}</span>
          </span>
        )}
        {wordCount > 0 && (
          <span className="text-[2.6vw] text-neo-cream/70 md:text-[1vw]">
            {t('education.classroomGame.words', { count: wordCount })}
          </span>
        )}
      </header>

      <div className="shrink-0">
        <ProjectorJoinPanel gameCode={gameCode} language={language} baseUrl={baseUrl} t={t} />
      </div>

      <ProjectorRoster students={students} readyUsernames={readyUsernames} t={t} />

      {autoStartSecondsLeft !== null && (
        <div
          role="status"
          aria-live="polite"
          className="flex shrink-0 items-center justify-between gap-3 rounded-neo border-3 border-neo-lime bg-neo-lime/20 px-4 py-3 shadow-hard"
        >
          <span className="font-neo-display text-[3vw] font-bold text-neo-lime md:text-[1.2vw]">
            {t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}
          </span>
          {onCancelAutoStart && (
            <button
              type="button"
              onClick={onCancelAutoStart}
              className="shrink-0 rounded-lg border-2 border-neo-lime/60 px-4 py-1.5 font-bold uppercase text-neo-lime transition-colors hover:bg-neo-lime/10"
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      )}

      {/* Settings ticker + the one Start control. */}
      {/* Settings ticker + the one Start control. Stacks on a phone — the
          teacher's own screen is often the projector, mirrored. */}
      <footer className="flex shrink-0 flex-col gap-[1.5vw] border-t-4 border-neo-cream/15 pt-[1.5vw] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-[1vw] md:pt-[1vw]">
        <ul className="flex flex-wrap items-center gap-[0.8vw] font-neo-body">
          {facts.map((fact) => (
            <li
              key={fact.key}
              className="inline-flex items-center gap-2 rounded-neo border-2 border-neo-cream/25 bg-neo-navy-light px-[1vw] py-[0.4vw] text-[2.6vw] font-bold text-neo-cream/85 md:text-[1vw]"
            >
              {fact.icon}
              {fact.text}
            </li>
          ))}
        </ul>

        <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-[0.8vw]">
          {/* The reason sits BESIDE the control it explains, not under it: a
              disabled button with no stated cause is the silent no-op this
              repo keeps shipping (recurring pitfall class 4). */}
          {!canStart && (
            <p
              data-testid="projector-start-reason"
              role="status"
              className="rounded-neo border-3 border-neo-pink/60 bg-neo-pink/10 px-3 py-2 text-start font-neo-body text-[3.2vw] font-bold leading-tight text-neo-pink md:max-w-[34ch] md:px-[1vw] md:py-[0.5vw] md:text-[1vw]"
            >
              {t('education.projectorLobby.startBlocked')}
            </p>
          )}
          {practiceRoundFailed && (
            <p
              data-testid="projector-practice-failed"
              role="status"
              className="max-w-[28ch] text-start font-neo-body text-[2.6vw] font-bold text-neo-pink md:text-[1vw]"
            >
              {t('tvLobby.practiceRoundFailed')}
            </p>
          )}
          {onStartPracticeRound && !canStart && (
            <button
              type="button"
              data-testid="projector-practice-round"
              onClick={onStartPracticeRound}
              disabled={practiceRoundPending}
              className="w-full rounded-neo border-3 border-neo-lime bg-neo-lime/10 px-3 py-2 font-neo-display text-[3.4vw] font-black uppercase text-neo-lime shadow-hard-sm transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50 md:w-auto md:px-[1.4vw] md:py-[0.7vw] md:text-[1.05vw]"
            >
              {practiceRoundPending ? t('common.loading') : t('tvLobby.tryPracticeRound')}
            </button>
          )}
          <button
            type="button"
            data-testid="projector-start"
            onClick={onStartGame}
            disabled={!canStart || starting}
            className={cn(
              'flex w-full items-center justify-center gap-[0.6vw] rounded-neo border-4 border-neo-black md:w-auto',
              'px-4 py-3 font-neo-display text-[5vw] font-black uppercase tracking-tight',
              'md:px-[2.4vw] md:py-[0.9vw] md:text-[2vw]',
              'bg-neo-lime text-neo-black shadow-hard-xl transition-all',
              'active:translate-y-1 active:shadow-hard',
              'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              // Locked, not muddy: a 40%-opacity lime on navy reads as a dead
              // olive slab. Say "not yet" in the palette instead.
              'disabled:cursor-not-allowed disabled:border-neo-cream/25 disabled:bg-neo-navy-light',
              'disabled:text-neo-cream/45 disabled:shadow-none'
            )}
          >
            <Play className="h-[0.8em] w-[0.8em] shrink-0" aria-hidden="true" />
            {starting ? t('hostView.creatingTournament') : t(startLabelKey)}
          </button>
        </div>
      </footer>
    </div>
  );
});

export default ProjectorLobby;
