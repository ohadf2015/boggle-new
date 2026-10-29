import { CLASSROOM_PRESETS, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import {
  VOCAB_QUIZ_MAX_QUESTION_COUNT,
  VOCAB_QUIZ_MAX_SECONDS,
  VOCAB_QUIZ_MIN_QUESTION_COUNT,
  VOCAB_QUIZ_MIN_SECONDS,
} from '@/shared/types/vocabQuiz';

type Raw = string | null | undefined;

function intIn(raw: Raw, min: number, max: number): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= min && n <= max ? n : undefined;
}

export function parseSessionPreset(raw: Raw): ClassroomPresetId | undefined {
  return raw && Object.prototype.hasOwnProperty.call(CLASSROOM_PRESETS, raw) ? (raw as ClassroomPresetId) : undefined;
}

export const parseQuizQuestions = (raw: Raw) => intIn(raw, VOCAB_QUIZ_MIN_QUESTION_COUNT, VOCAB_QUIZ_MAX_QUESTION_COUNT);
export const parseQuizSeconds = (raw: Raw) => intIn(raw, VOCAB_QUIZ_MIN_SECONDS, VOCAB_QUIZ_MAX_SECONDS);

export function parseSessionPack(raw: Raw): string | undefined {
  return raw && /^LC-[A-Z]{2}-PK-[A-Z0-9-]{1,40}$/.test(raw) ? raw : undefined;
}
