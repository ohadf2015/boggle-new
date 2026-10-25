import type { ClassroomBossId } from '@/shared/types/classroomBoss';
import type { ClassroomGameMode, PracticeFocusSetting, VocabQuizVariant } from '@/shared/types/vocabQuiz';
import { clampTeamCount, type PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility, ClassroomPressure } from '@/shared/types/classroom';

export interface ClassroomLaunchPayload {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  /** The selected list's language; the server reconciles it with the class language. */
  language?: string;
  settings: {
    timerMinutes: number;
    boardSize: 'small' | 'medium' | 'large';
    allowLateJoin: boolean;
    /** In-round cash economy switches; stored on the room by the create handler. */
    economy?: { wrongAnswerCost: boolean; powerUps: boolean };
    gameMode: ClassroomGameMode;
    targetWord?: string;
    vocabQuizFocus?: PracticeFocusSetting;
    vocabQuizQuestionCount?: number;
    vocabQuizSeconds?: number;
    vocabQuizVariant?: VocabQuizVariant;
    treasureChestsEnabled?: boolean;
    classroomBossId?: ClassroomBossId;
    playStyle: PlayStyle;
    teamCount?: number;
    accessibility?: ClassroomAccessibility;
    /**
     * The Pro pressure dials. NOT sent inside `createClassroomGame` — that
     * handler whitelists its settings keys — but held and emitted as
     * `updateClassroomGamePressure` the moment the room exists. Absent for a
     * free teacher: the loud default is the free tier.
     */
    pressure?: ClassroomPressure;
  };
}

type LaunchSettings = ClassroomLaunchPayload['settings'];

export interface ClassroomLaunchInput extends Omit<ClassroomLaunchPayload, 'settings'> {
  mode: ClassroomGameMode;
  timerMinutes: number;
  boardSize: LaunchSettings['boardSize'];
  allowLateJoin: boolean;
  playStyle: PlayStyle;
  economy?: LaunchSettings['economy'];
  bossId?: ClassroomBossId | null;
  targetWord?: string;
  quiz?: {
    focus: PracticeFocusSetting;
    questionCount: number;
    seconds: number;
    treasureChestsEnabled?: boolean;
    variant?: VocabQuizVariant | null;
  };
  teamCount?: number;
  accessibility?: ClassroomAccessibility;
  pressure?: ClassroomPressure;
}

export function buildClassroomLaunchPayload(input: ClassroomLaunchInput): ClassroomLaunchPayload {
  const { mode, timerMinutes, boardSize, allowLateJoin, playStyle, economy, bossId, targetWord, quiz, teamCount, accessibility, pressure, ...room } = input;
  const accessibilityOn = accessibility && (accessibility.largeText || accessibility.audioCues || accessibility.participationPoints);
  return {
    ...room,
    settings: {
      timerMinutes,
      boardSize,
      allowLateJoin,
      ...(economy ? { economy } : {}),
      gameMode: mode,
      ...(bossId ? { classroomBossId: bossId } : {}),
      ...(targetWord ? { targetWord } : {}),
      ...(mode === 'vocab-quiz' && quiz
        ? {
            vocabQuizFocus: quiz.focus,
            vocabQuizQuestionCount: quiz.questionCount,
            vocabQuizSeconds: quiz.seconds,
            ...(quiz.treasureChestsEnabled !== undefined ? { treasureChestsEnabled: quiz.treasureChestsEnabled } : {}),
            ...(quiz.variant ? { vocabQuizVariant: quiz.variant } : {}),
          }
        : {}),
      playStyle,
      ...(playStyle === 'teams' ? { teamCount: clampTeamCount(teamCount) } : {}),
      ...(accessibilityOn ? { accessibility } : {}),
      ...(pressure ? { pressure } : {}),
    },
  };
}

/** The create handler whitelists its settings keys, so the Pro dials travel as a follow-up emit once the room exists. */
export function splitLaunchPayload(payload: ClassroomLaunchPayload): {
  createPayload: Omit<ClassroomLaunchPayload, 'settings'> & { settings: Omit<LaunchSettings, 'pressure'> };
  pressure: ClassroomPressure | null;
} {
  const { pressure, ...settings } = payload.settings;
  return { createPayload: { ...payload, settings }, pressure: pressure ?? null };
}
