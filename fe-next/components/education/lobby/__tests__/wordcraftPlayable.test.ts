import { describe, it, expect } from 'vitest';
import { wordcraftPlayable, WORDCRAFT_LOBBY_RACK_SIZE } from '../wordcraftPlayable';
import {
  createWordcraftLiveSession,
  resolveWordcraftClassroomStart,
  WORDCRAFT_LIVE_RACK_SIZE,
} from '@/backend/modules/wordcraftClassroomManager';
import { resolveClassroomGameLanguage } from '@/shared/utils/classroomGameLanguage';
import { applyVocabularyCap, getPresetValues, SPED_VOCAB_CAP, type ClassroomPresetId } from '@/lib/education/classroomPresets';

const LONG = ['photosynthesis', 'independence', 'extraordinary', 'transpiration'];
const LONG_THEN_SHORT = [...Array.from({ length: SPED_VOCAB_CAP }, (_, i) => `${LONG[i % LONG.length]}`), 'cat'];

type Case = { name: string; words: string[]; lessonLanguage?: string; classroomLanguage?: string; preset?: ClassroomPresetId };
const CASES: Case[] = [
  { name: 'short english words', words: ['cat', 'star', 'stare'], lessonLanguage: 'en' },
  { name: 'only words longer than the rack', words: LONG, lessonLanguage: 'en' },
  { name: 'one fitting word among long ones', words: ['photosynthesis', 'juxtapose'], lessonLanguage: 'en' },
  { name: 'multi-word phrases', words: ['ice cream', 'post office'], lessonLanguage: 'en' },
  { name: 'russian lesson dealt from the english bag', words: ['кошка', 'собака'], lessonLanguage: 'ru' },
  { name: 'hebrew lesson', words: ['שלום', 'ספר'], lessonLanguage: 'he' },
  { name: 'hebrew words on a list labelled english', words: ['שלום', 'ספר'], lessonLanguage: 'en' },
  { name: 'no lesson language, hebrew class', words: ['שלום'], classroomLanguage: 'he' },
  { name: 'spanish accents', words: ['canción', 'árbol'], lessonLanguage: 'es' },
  { name: 'short word cut by the SPED cap', words: LONG_THEN_SHORT, lessonLanguage: 'en', preset: 'sped' },
  { name: 'short word kept without a cap', words: LONG_THEN_SHORT, lessonLanguage: 'en', preset: 'standard' },
  { name: 'empty list', words: [], lessonLanguage: 'en' },
];

function serverStarts({ words, lessonLanguage, classroomLanguage, preset }: Case) {
  const sent = applyVocabularyCap(words, preset ? getPresetValues(preset).vocabularyCap : 0);
  const language = resolveClassroomGameLanguage({ lessonLanguage, classroomLanguage, vocabularyWords: sent });
  const session = createWordcraftLiveSession({ gameCode: 'T', vocabularyWords: sent, language, usernames: [] });
  const start = resolveWordcraftClassroomStart({
    resolvedMode: 'wordcraft',
    classroomGame: { vocabularyWords: sent, settings: { gameMode: 'wordcraft' } },
    gameCode: 'T',
    gameSessionId: 1,
    playerUsernames: [],
    language,
  });
  expect(start.mode === 'wordcraft').toBe(session.targets.length > 0);
  return start.mode === 'wordcraft';
}

describe('wordcraftPlayable', () => {
  it('GIVEN the lobby rack WHEN compared with the server rack THEN they are the same width', () => {
    expect(WORDCRAFT_LOBBY_RACK_SIZE).toBe(WORDCRAFT_LIVE_RACK_SIZE);
  });

  it('GIVEN a lesson of words longer than nine letters THEN Wordcraft cannot run it', () => {
    expect(wordcraftPlayable(LONG, { lessonLanguage: 'en' })).toBe(false);
  });

  it('GIVEN a Russian lesson THEN Wordcraft cannot run it, because it deals from the English bag', () => {
    expect(wordcraftPlayable(['кошка', 'собака'], { lessonLanguage: 'ru' })).toBe(false);
  });

  it('GIVEN the SPED preset cuts the only short word THEN Wordcraft cannot run it', () => {
    expect(wordcraftPlayable(LONG_THEN_SHORT, { lessonLanguage: 'en', preset: 'sped' })).toBe(false);
  });

  it('GIVEN Hebrew words on a list labelled English THEN Wordcraft runs them on the Hebrew bag', () => {
    expect(wordcraftPlayable(['שלום', 'ספר'], { lessonLanguage: 'en' })).toBe(true);
  });

  it.each(CASES)('agrees with what the server deals: $name', (c) => {
    expect(wordcraftPlayable(c.words, c)).toBe(serverStarts(c));
  });
});
