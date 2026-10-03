'use client';

// useHostLobby applies this preset only in HostPreGameView; a classroom host sits in the TV lobby, so it never ran there.
import { useEffect } from 'react';
import type { DifficultyLevel } from '@/shared/constants/gameConstants';
import { classroomHostPreset, type ClassroomTemplateSettings } from '@/lib/education/classroomHostPreset';

const seededRooms = new Set<string>();

export function __resetClassroomSettingsSeeds(): void {
  seededRooms.clear();
}

export function useClassroomSettingsSeed({
  isClassroomMode,
  gameCode,
  templateSettings,
  setTimerValue,
  setDifficulty,
  setMinWordLength,
}: {
  isClassroomMode: boolean;
  gameCode: string;
  templateSettings: ClassroomTemplateSettings | null | undefined;
  setTimerValue: (minutes: number) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  setMinWordLength: (length: number) => void;
}): void {
  const preset = isClassroomMode ? classroomHostPreset(templateSettings) : null;
  const timer = preset?.timerMinutes;
  const difficulty = preset?.difficulty;
  const minLength = preset?.minWordLength;

  useEffect(() => {
    if (timer === undefined || difficulty === undefined || minLength === undefined) return;
    if (!gameCode || seededRooms.has(gameCode)) return;
    seededRooms.add(gameCode);
    setTimerValue(timer);
    setDifficulty(difficulty);
    setMinWordLength(minLength);
  }, [timer, difficulty, minLength, gameCode, setTimerValue, setDifficulty, setMinWordLength]);
}
