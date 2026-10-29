'use client';

import { useCallback, useState } from 'react';
import { VOCAB_QUIZ_DEFAULT_QUESTION_COUNT, VOCAB_QUIZ_DEFAULT_SECONDS, type PracticeFocusSetting } from '@/shared/types/vocabQuiz';
import { getPresetValues, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility, ClassroomPressure } from '@/shared/types/classroom';
import { DEFAULT_CLASSROOM_PRESSURE } from '@/shared/utils/classroomPressure';
import { ZERO_ECONOMY_SNAPSHOT } from '@/shared/constants/classroomEconomy';
import type { VocabularyLesson } from '@/lib/supabase/education';
import { useRotatingBoss } from '../boss/useRotatingBoss';
import type { ClassroomEconomyConfig } from './LobbyEconomyToggles';
import { readRememberedRoundDefaults } from './rememberedRoundDefaults';
import { defaultLessonIdsFor } from './useTeacherLobbyData';

type BoardSize = 'small' | 'medium' | 'large';

interface Args {
  initialMinutes?: number;
  initialQuestions?: number;
  initialSeconds?: number;
  lessons: VocabularyLesson[];
  selectedClassroomId: string;
  setSelectedLessonIds: (ids: string[] | ((prev: string[]) => string[])) => void;
}

/** Every round setting behind "Game options", each with a default so none is a question before GO LIVE. */
export function useLobbyRoundOptions({ initialMinutes, initialQuestions, initialSeconds, lessons, selectedClassroomId, setSelectedLessonIds }: Args) {
  const [remembered] = useState(readRememberedRoundDefaults);
  const [bossId, setBossId] = useRotatingBoss();
  const [vocabQuizFocus, setVocabQuizFocus] = useState<PracticeFocusSetting>('any');
  const [vocabQuizQuestionCount, setVocabQuizQuestionCount] = useState(initialQuestions ?? VOCAB_QUIZ_DEFAULT_QUESTION_COUNT);
  const [vocabQuizSeconds, setVocabQuizSeconds] = useState(initialSeconds ?? VOCAB_QUIZ_DEFAULT_SECONDS);
  const [treasureChestsEnabled, setTreasureChestsEnabled] = useState(true);
  const [targetWord, setTargetWord] = useState('');
  const [minWordLength, setMinWordLength] = useState(3);
  const [timerMinutes, setTimerMinutes] = useState(initialMinutes ?? remembered?.timerMinutes ?? 3);
  const [allowLateJoin, setAllowLateJoin] = useState(remembered?.allowLateJoin ?? true);
  const [economy, setEconomy] = useState<ClassroomEconomyConfig>(ZERO_ECONOMY_SNAPSHOT.config);
  const [boardSize, setBoardSize] = useState<BoardSize>(remembered?.boardSize ?? 'medium');
  const [playStyle, setPlayStyleState] = useState<PlayStyle>('ffa');
  const [teamCount, setTeamCountState] = useState(2);
  const [accessibility, setAccessibilityState] = useState<ClassroomAccessibility>({});
  // Loud defaults; the launch carries them only for a Pro teacher.
  const [pressure, setPressure] = useState<ClassroomPressure>(DEFAULT_CLASSROOM_PRESSURE);
  const [activePreset, setActivePreset] = useState<ClassroomPresetId | null>(null);

  const applyPreset = useCallback(
    (id: ClassroomPresetId) => {
      const preset = getPresetValues(id);
      setTimerMinutes(preset.timerMinutes);
      setBoardSize(preset.boardSize);
      setMinWordLength(preset.minWordLength);
      setPlayStyleState(preset.playStyle);
      setTeamCountState(preset.teamCount);
      setAccessibilityState(preset.accessibility);
      setActivePreset(id);
      if (id === 'friday-battle') {
        setSelectedLessonIds((prev) => (prev.length > 0 ? prev : defaultLessonIdsFor(lessons, selectedClassroomId)));
      }
    },
    [lessons, selectedClassroomId, setSelectedLessonIds]
  );

  const setPlayStyle = useCallback((v: PlayStyle) => { setPlayStyleState(v); setActivePreset(null); }, []);
  const setTeamCount = useCallback((v: number) => { setTeamCountState(v); setActivePreset(null); }, []);
  const setAccessibility = useCallback((v: ClassroomAccessibility) => { setAccessibilityState(v); setActivePreset(null); }, []);

  return {
    bossId, setBossId,
    vocabQuizFocus, setVocabQuizFocus,
    vocabQuizQuestionCount, setVocabQuizQuestionCount,
    vocabQuizSeconds, setVocabQuizSeconds,
    treasureChestsEnabled, setTreasureChestsEnabled,
    targetWord, setTargetWord,
    minWordLength, setMinWordLength,
    timerMinutes, setTimerMinutes,
    allowLateJoin, setAllowLateJoin,
    economy, setEconomy,
    boardSize, setBoardSize,
    playStyle, setPlayStyle,
    teamCount, setTeamCount,
    accessibility, setAccessibility,
    pressure, setPressure,
    activePreset, applyPreset,
  };
}

export type LobbyRoundOptions = ReturnType<typeof useLobbyRoundOptions>;
