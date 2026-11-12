'use client';

import { useContext } from 'react';
import { GraduationCap, BookOpen, LayoutGrid, Search, Zap, RotateCw, Grid3x3, Building2, Grid2x2, Brain } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types/game';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';
import { isStudentTimerHidden } from '@/shared/utils/classroomPressure';
import { SocketContext } from '@/utils/SocketContext';
import { useIsVocabQuizRoom } from './vocabQuiz/useIsVocabQuizRoom';
import { useClassroomSeatCapNotice } from './controls/useClassroomSeatCapNotice';
import { StudentModeStrip } from './ClassroomModeBannerStudent';

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  /**
   * Widened past `GameMode` on purpose: a classroom room can be a Vocab Quiz,
   * which is deliberately not a board mode. This value comes out of
   * sessionStorage, so the narrower type was a lie the compiler believed and
   * the host crashed on.
   */
  gameMode?: ClassroomGameMode;
  vocabQuizVariant?: 'classic' | 'boss';
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

interface ClassroomModeBannerProps {
  lessonData: LessonData | null;
  gameCode?: string;
  expanded?: boolean;
  /**
   * Whoever is running the room. Defaults to true so the teacher's screen — the
   * only caller before students had a lobby of their own — cannot regress.
   *
   * A student is not a host: the share code, the copy button and the QR poster
   * are the host's controls for filling the room, and printing them on the phone
   * that just scanned that QR is noise at best.
   */
  isHost?: boolean;
  /**
   * The room's own record of itself, from `/api/education/classroom/live-game`.
   *
   * `lessonData` cannot serve a student: it is read from `lessonGameData` in the
   * TEACHER's sessionStorage, so a student's copy is always null and every field
   * below fell through to a default (mode "Classic", 6×6, no lesson name).
   */
  liveGame?: LiveClassroomGameInfo | null;
  /** The round's results are up: the student's podium owns the phone, so their mode strip stands down. */
  showResults?: boolean;
}

/**
 * Exported so `__tests__/classroomModeRegistry` can pin every classroom mode to
 * an entry here. A missing key used to render `<undefined/>`, which React
 * throws on — killing the teacher's whole host view and tearing the room down
 * before any student could join.
 */
export const MODE_ICON: Record<string, typeof LayoutGrid> = {
  classic: LayoutGrid,
  'word-hunt': Search,
  blast: Zap,
  'wheel-rush': RotateCw,
  'word-tower': Building2,
  crossword: Grid3x3,
  wordcraft: Grid2x2,
  'vocab-quiz': Brain,
};

/** Shown when a mode has no icon, so a cosmetic gap can never crash a host. */

export { MODE_TRANSLATION_KEY } from './classroomModeLabels';

/**
 * Classroom session banner + in-lobby info panel.
 *
 * Slim banner for the room, plus the student's mode strip in the lobby. The host's
 * lobby belongs to the projector board, so the host gets nothing while it is up.
 */
export function ClassroomModeBanner({
  lessonData,
  gameCode,
  expanded = false,
  isHost = true,
  liveGame = null,
  showResults = false,
}: ClassroomModeBannerProps) {
  const { t } = useLanguage();

  // Two sources, and only one of them exists on any given client: `lessonData`
  // is the teacher's own sessionStorage, `liveGame` is what the server says
  // about the room. Read the local one first (it is what the teacher just
  // picked, before the room even exists) and fall back to the server's.
  const remoteSettings = liveGame?.settings ?? null;
  const lessonName = lessonData?.lessonName || (liveGame?.lessonNames ?? []).join(' · ');
  const wordCount = lessonData?.vocabularyWords?.length || 0;
  const templateSettings = lessonData?.templateSettings || null;
  const gameMode: ClassroomGameMode = lessonData?.gameMode || liveGame?.gameMode || 'classic';
  const timerMinutes = templateSettings
    ? Math.round(templateSettings.timerSeconds / 60)
    : remoteSettings?.timerMinutes ?? null;
  const boardSize = templateSettings?.difficulty ?? remoteSettings?.boardSize ?? undefined;

  const questionCount = remoteSettings?.vocabQuizQuestionCount ?? null;
  const questionSeconds = remoteSettings?.vocabQuizSeconds ?? null;

  // Teacher turned the clock off: announcing "TIMER 3 min" would describe
  // pressure nobody is under. Omit the row rather than print a lie.
  const timerOff = remoteSettings?.pressure ? isStudentTimerHidden(remoteSettings.pressure) : false;

  // The class's own name, which the server resolves and the teacher's local copy
  // never carried. The generic label stays as the fallback for a room whose
  // classroom could not be named.
  const sessionLabel = liveGame?.classroomName || t('education.classroomGame.classroomSession');

  // A student's every settings value comes from `liveGame`, so without it the
  // whole card renders defaults: Classic, 6×6, three minutes. That is the exact
  // wrong screen this component exists to stop showing, restored silently
  // whenever the lookup fails — and it fails per IP, which a whole class shares.
  // Recurring pitfall class 4. Show the class and the lesson, and nothing we do
  // not actually know.
  // A quiz never sets the store's `gameActive`, so `expanded` (= !gameActive)
  // reads "lobby" at the final whistle and re-opened this whole card over the
  // student's podium, pushing their next action off a 390x844 phone. Once the
  // room has shown quiz traffic the quiz surface owns the screen; the same
  // detector the shell uses to hide this chrome during play releases on the
  // next board round (Class 3: one signal, not a second guess).
  const roomSocket = useContext(SocketContext)?.socket ?? null;
  const quizOwnsScreen = useIsVocabQuizRoom(roomSocket);
  useClassroomSeatCapNotice(roomSocket, isHost, gameCode, t);
  const showStrip = expanded && !quizOwnsScreen && !!gameCode && !isHost && !!liveGame && !showResults;

  // A classroom host is always on the projector board (fixed, z-65), which owns the code and QR: no second copy.
  if (isHost && expanded && !!gameCode) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'w-full px-4 py-2',
          'bg-neo-cyan/15 border-b-3 border-neo-cyan',
          'flex items-center justify-center gap-3 flex-wrap',
          'text-sm font-neo-body'
        )}
      >
        <div className="flex items-center gap-2 text-neo-cyan font-bold">
          <GraduationCap className="w-4 h-4" />
          <span>{sessionLabel}</span>
        </div>

        {lessonName && (
          <>
            <span className="text-neo-white" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5 text-neo-white">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px] sm:max-w-[400px]">{lessonName}</span>
            </div>
          </>
        )}

        {wordCount > 0 && (
          <>
            <span className="text-neo-white" aria-hidden="true">|</span>
            <span className="text-neo-white">
              {t('education.classroomGame.words', { count: wordCount })}
            </span>
          </>
        )}
      </div>

      {showStrip && (
        <StudentModeStrip
          gameMode={gameMode}
          vocabQuizVariant={lessonData?.vocabQuizVariant ?? liveGame?.settings?.vocabQuizVariant}
          lessonName={lessonName}
          questionCount={questionCount}
          questionSeconds={questionSeconds}
          timerMinutes={timerMinutes}
          timerOff={timerOff}
          boardSize={boardSize}
          t={t}
        />
      )}

    </>
  );
}
