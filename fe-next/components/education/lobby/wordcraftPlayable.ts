import { lessonTargetsFor, wordCraftLocaleFor } from '@/lib/word-craft/lessonBag';
import { resolveClassroomGameLanguage } from '@/shared/utils/classroomGameLanguage';
import { applyVocabularyCap, getPresetValues, type ClassroomPresetId } from '@/lib/education/classroomPresets';

export const WORDCRAFT_LOBBY_RACK_SIZE = 9;

export interface WordcraftDealInput {
  lessonLanguage?: string;
  classroomLanguage?: string;
  preset?: ClassroomPresetId | null;
}

// The server silently downgrades a Wordcraft room to Classic when no lesson word fits the rack.
export function wordcraftPlayable(words: string[], { lessonLanguage, classroomLanguage, preset }: WordcraftDealInput): boolean {
  const sent = applyVocabularyCap(words, preset ? getPresetValues(preset).vocabularyCap : 0);
  const language = resolveClassroomGameLanguage({ lessonLanguage, classroomLanguage, vocabularyWords: sent });
  const { locale } = wordCraftLocaleFor(language, language);
  return lessonTargetsFor(sent, locale, WORDCRAFT_LOBBY_RACK_SIZE).length > 0;
}
