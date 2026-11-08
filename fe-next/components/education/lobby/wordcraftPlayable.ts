import { lessonTargetsFor, wordCraftLocaleFor } from '@/lib/word-craft/lessonBag';
import { resolveClassroomGameLanguage } from '@/shared/utils/classroomGameLanguage';
import { applyVocabularyCap, getPresetValues, type ClassroomPresetId } from '@/lib/education/classroomPresets';

export const WORDCRAFT_LOBBY_RACK_SIZE = 9;

export interface WordcraftDealInput {
  lessonLanguage?: string;
  classroomLanguage?: string;
  preset?: ClassroomPresetId | null;
}

/** 'language': no live tile set for the list's language; 'rack': no list word fits the rack. */
export type WordcraftBlockReason = 'language' | 'rack';

// The server silently downgrades a Wordcraft room to Classic when no lesson word fits the rack.
export function wordcraftBlockReason(words: string[], { lessonLanguage, classroomLanguage, preset }: WordcraftDealInput): WordcraftBlockReason | null {
  const sent = applyVocabularyCap(words, preset ? getPresetValues(preset).vocabularyCap : 0);
  const language = resolveClassroomGameLanguage({ lessonLanguage, classroomLanguage, vocabularyWords: sent });
  const { locale, seeded } = wordCraftLocaleFor(language, language);
  if (!seeded) return 'language';
  return lessonTargetsFor(sent, locale, WORDCRAFT_LOBBY_RACK_SIZE).length > 0 ? null : 'rack';
}

export function wordcraftPlayable(words: string[], input: WordcraftDealInput): boolean {
  return wordcraftBlockReason(words, input) === null;
}

export const WORDCRAFT_BLOCK_TILE_KEY: Record<WordcraftBlockReason, string> = {
  language: 'eg2Modes.blocked.wordcraftLanguage',
  rack: 'eg2Modes.blocked.wordcraftRack',
};

export const WORDCRAFT_BLOCK_GO_LIVE_KEY: Record<WordcraftBlockReason, string> = {
  language: 'education.modePicker.wordcraftNoTiles',
  rack: 'education.modePicker.wordcraftNeedsShortWords',
};
