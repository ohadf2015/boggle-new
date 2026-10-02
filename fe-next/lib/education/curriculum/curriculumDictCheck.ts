import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { normalizeWord, sanitizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/lib/supabase/education/types';

const DICT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public/dicts');

/** The key the game itself looks a lesson word up by (same folding as backend/utils/lessonVocabulary). */
export function dictionaryKey(word: string, language: Language): string {
  return normalizeWord(sanitizeWord(word.normalize('NFKC'), language), language);
}

export function loadShippedDictionary(language: Language): Set<string> {
  const raw = gunzipSync(fs.readFileSync(path.join(DICT_DIR, `${language}.dict.gz`))).toString('utf8');
  return new Set(raw.split('\n').filter(Boolean));
}
