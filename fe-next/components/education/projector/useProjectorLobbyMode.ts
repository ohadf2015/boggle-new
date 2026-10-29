'use client';

import { useState } from 'react';
import { fixedRoundSeconds } from '@/shared/utils/fixedRoundTimer';
import { useLiveClassroomGameInfo } from '@/hooks/useLiveClassroomGameInfo';
import { BOSS_BATTLE_ID, catalogueIdOf, launchOf, readLocalBossId, readLocalQuizPlayable, readLocalQuizVariant, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { readLocalGameMode } from '@/components/education/lobby/useClassroomModeSwitch';
import { useQuizStartRefused } from '@/components/education/projector/ProjectorQuizBlocked';
import { boardSizeLabel } from '@/components/education/classroomModeLabels';
import { isStudentTimerHidden } from '@/shared/utils/classroomPressure';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface LobbyFact {
  key: 'timer' | 'board' | 'questions' | 'seconds' | 'late';
  text: string;
}

interface Input {
  gameCode: string;
  classroomGameMode?: ClassroomGameMode;
  templateSettings?: { timerSeconds: number; difficulty?: string; allowLateJoin?: boolean } | null;
  t: Translate;
}

/** Mode precedence: an in-place switch, then the teacher's launch, then the room record. */
export function useProjectorLobbyMode({ gameCode, classroomGameMode, templateSettings, t }: Input) {
  const liveGame = useLiveClassroomGameInfo(gameCode, true);
  // The shell reads lessonGameData once at mount, so a lobby remounted after a round would revert to the launch mode.
  const [switchedMode, setSwitchedMode] = useState<ClassroomCatalogueId | null>(() => {
    const local = readLocalGameMode();
    const id = local ? catalogueIdOf(local, readLocalQuizVariant(), readLocalBossId()) : null;
    return id && id !== classroomGameMode ? id : null;
  });
  const quizVariant = readLocalQuizVariant() ?? liveGame?.settings?.vocabQuizVariant;
  const modeId: ClassroomCatalogueId =
    switchedMode ?? catalogueIdOf(classroomGameMode ?? liveGame?.gameMode ?? 'classic', quizVariant, readLocalBossId() ?? liveGame?.settings?.classroomBossId);
  // A room still on the retired quiz-boss variant keeps running the quiz engine until it ends.
  const legacyQuizBoss = modeId === BOSS_BATTLE_ID && quizVariant === 'boss';
  const mode: ClassroomGameMode = legacyQuizBoss ? VOCAB_QUIZ_MODE : launchOf(modeId).gameMode;
  const isQuiz = mode === VOCAB_QUIZ_MODE;
  const [quizRefused, clearQuizRefused] = useQuizStartRefused(gameCode, t);
  const [quizPlayable] = useState(readLocalQuizPlayable);
  const settings = liveGame?.settings ?? null;
  const timerOff = settings?.pressure ? isStudentTimerHidden(settings.pressure) : false;
  const fixedSeconds = fixedRoundSeconds(mode);
  const timerMinutes = fixedSeconds
    ? Math.ceil(fixedSeconds / 60)
    : templateSettings ? Math.round(templateSettings.timerSeconds / 60) : settings?.timerMinutes ?? null;

  const facts: LobbyFact[] = [];
  if (isQuiz) {
    if (settings?.vocabQuizQuestionCount != null) {
      facts.push({ key: 'questions', text: `${settings.vocabQuizQuestionCount} · ${t('education.classroomGame.questions')}` });
    }
    if (settings?.vocabQuizSeconds != null && !timerOff) {
      facts.push({ key: 'seconds', text: t('vocabQuiz.setup.seconds', { seconds: settings.vocabQuizSeconds }) });
    }
  } else {
    if (timerMinutes != null && !timerOff) facts.push({ key: 'timer', text: t('eduLiveRoom.lobby.minutes', { count: timerMinutes }) });
    // Wordcraft deals every student its own fixed board; the grid setting never reaches it.
    if (mode !== 'wordcraft') facts.push({ key: 'board', text: boardSizeLabel(templateSettings?.difficulty ?? settings?.boardSize) });
  }
  const allowLateJoin = templateSettings?.allowLateJoin ?? settings?.allowLateJoin ?? true;
  facts.push({ key: 'late', text: t(allowLateJoin ? 'education.projectorLobby.lateJoinOn' : 'education.projectorLobby.lateJoinOff') });

  const applyMode = (id: ClassroomCatalogueId) => {
    clearQuizRefused();
    setSwitchedMode(id);
  };

  return {
    modeId,
    mode,
    isQuiz,
    switched: switchedMode !== null,
    quizBlocked: isQuiz && (quizRefused || quizPlayable === false),
    facts,
    className: liveGame?.classroomName ?? null,
    lessonNames: liveGame?.lessonNames ?? [],
    roundSettings: {
      timerMinutes: settings?.timerMinutes ?? undefined,
      vocabQuizQuestionCount: settings?.vocabQuizQuestionCount ?? undefined,
      vocabQuizSeconds: settings?.vocabQuizSeconds ?? undefined,
    },
    applyMode,
  };
}
