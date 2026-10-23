import { describe, it, expect } from 'vitest';
import { wordcraftPlayable, WORDCRAFT_LOBBY_RACK_SIZE } from '../wordcraftPlayable';
import {
  createWordcraftLiveSession,
  resolveWordcraftClassroomStart,
  WORDCRAFT_LIVE_RACK_SIZE,
} from '@/backend/modules/wordcraftClassroomManager';

const CASES: Array<{ name: string; words: string[]; language: string }> = [
  { name: 'short english words', words: ['cat', 'star', 'stare'], language: 'en' },
  { name: 'only words longer than the rack', words: ['photosynthesis', 'independence', 'extraordinary'], language: 'en' },
  { name: 'one fitting word among long ones', words: ['photosynthesis', 'juxtapose'], language: 'en' },
  { name: 'multi-word phrases', words: ['ice cream', 'post office'], language: 'en' },
  { name: 'russian lesson dealt from the english bag', words: ['кошка', 'собака'], language: 'ru' },
  { name: 'hebrew lesson', words: ['שלום', 'ספר'], language: 'he' },
  { name: 'spanish accents', words: ['canción', 'árbol'], language: 'es' },
  { name: 'empty list', words: [], language: 'en' },
];

describe('wordcraftPlayable', () => {
  it('GIVEN the lobby rack WHEN compared with the server rack THEN they are the same width', () => {
    expect(WORDCRAFT_LOBBY_RACK_SIZE).toBe(WORDCRAFT_LIVE_RACK_SIZE);
  });

  it('GIVEN a lesson of words longer than nine letters THEN Wordcraft cannot run it', () => {
    expect(wordcraftPlayable(['photosynthesis', 'independence'], 'en')).toBe(false);
  });

  it('GIVEN a Russian lesson THEN Wordcraft cannot run it, because it deals from the English bag', () => {
    expect(wordcraftPlayable(['кошка', 'собака'], 'ru')).toBe(false);
  });

  it('GIVEN at least one word that fits the rack THEN Wordcraft can run it', () => {
    expect(wordcraftPlayable(['photosynthesis', 'juxtapose'], 'en')).toBe(true);
  });

  it.each(CASES)('agrees with the server deal and start decision: $name', ({ words, language }) => {
    const session = createWordcraftLiveSession({ gameCode: 'T', vocabularyWords: words, language, usernames: [] });
    const start = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame: { vocabularyWords: words, settings: { gameMode: 'wordcraft' } },
      gameCode: 'T',
      gameSessionId: 1,
      playerUsernames: [],
      language,
    });
    expect(wordcraftPlayable(words, language)).toBe(session.targets.length > 0);
    expect(wordcraftPlayable(words, language)).toBe(start.mode === 'wordcraft');
  });
});
