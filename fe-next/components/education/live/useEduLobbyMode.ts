'use client';

import { fixedRoundSeconds } from '@/shared/utils/fixedRoundTimer';
import { useState } from 'react';
import { useLiveClassroomGameInfo } from '@/hooks/useLiveClassroomGameInfo';
import { catalogueIdOf, launchOf, readLocalBossId, readLocalQuizPlayable, readLocalQuizVariant, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { readLocalGameMode } from '@/components/education/lobby/useClassroomModeSwitch';
import { useQuizStartRefused } from '@/components/education/projector/ProjectorQuizBlocked';
import { isStudentTimerHidden } from '@/shared/utils/classroomPressure';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface Input {
  gameCode: string;
  classroomGameMode?: ClassroomGameMode;
  templateSettings?: { timerSeconds: number } | null;
  t: Translate;
}

/** Same source precedence as the shared projector lobby: an in-place switch, then the teacher's launch, then the room record. */
export function useEduLobbyMode({ gameCode, classroomGameMode, templateSettings, t }: Input) {
  const liveGame = useLiveClassroomGameInfo(gameCode, true);
  const [switchedMode, setSwitchedMode] = useState<ClassroomCatalogueId | null>(() => {
    const local = readLocalGameMode();
    const id = local ? catalogueIdOf(local, readLocalQuizVariant(), readLocalBossId()) : null;
    return id && id !== classroomGameMode ? id : null;
  });
  const modeId: ClassroomCatalogueId =
    switchedMode ??
    catalogueIdOf(
      classroomGameMode ?? liveGame?.gameMode ?? 'classic',
      readLocalQuizVariant() ?? liveGame?.settings?.vocabQuizVariant,
      readLocalBossId() ?? liveGame?.settings?.classroomBossId,
    );
  const mode: ClassroomGameMode = launchOf(modeId).gameMode;
  const isQuiz = mode === VOCAB_QUIZ_MODE;
  const [quizRefused, clearQuizRefused] = useQuizStartRefused(gameCode, t);
  const [quizPlayable] = useState(readLocalQuizPlayable);
  const settings = liveGame?.settings ?? null;
  const timerOff = settings?.pressure ? isStudentTimerHidden(settings.pressure) : false;
  const fixedSeconds = fixedRoundSeconds(mode);
  const timerMinutes = fixedSeconds
    ? Math.ceil(fixedSeconds / 60)
    : templateSettings ? Math.round(templateSettings.timerSeconds / 60) : settings?.timerMinutes ?? null;

  const applyMode = (id: ClassroomCatalogueId) => {
    clearQuizRefused();
    setSwitchedMode(id);
  };

  return {
    modeId,
    isQuiz,
    quizBlocked: isQuiz && (quizRefused || quizPlayable === false),
    timerMinutes: isQuiz || timerOff ? null : timerMinutes,
    className: liveGame?.classroomName ?? null,
    roundSettings: {
      timerMinutes: settings?.timerMinutes ?? undefined,
      vocabQuizQuestionCount: settings?.vocabQuizQuestionCount ?? undefined,
      vocabQuizSeconds: settings?.vocabQuizSeconds ?? undefined,
    },
    applyMode,
  };
}
