import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import { dictionary } from '../dictionary';
import type { Language } from '@/shared/types';

// Word Hunt embeds these words on the board as the answer, so each must be a word the dictionary accepts.
const LISTS: Array<[Language, string]> = [
  ['en', 'common_hunt_words.txt'],
  ['he', 'common_hunt_words_he.txt'],
  ['sv', 'common_hunt_words_sv.txt'],
  ['es', 'common_hunt_words_es.txt'],
  ['ru', 'common_hunt_words_ru.txt'],
];

describe('Word Hunt target lists', () => {
  beforeAll(async () => {
    for (const [lang] of LISTS) await dictionary.ensureLanguageLoaded(lang);
  }, 120_000);

  it.each(LISTS)('every %s target is a valid word', (lang, file) => {
    const words = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').split('\n').map((w) => w.trim()).filter(Boolean);
    expect(words.filter((w) => dictionary.isValidWord(w, lang) !== true)).toEqual([]);
  });
});
