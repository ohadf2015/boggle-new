import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { foldEsAccents } from '../../../lib/crossword/answer';

/** Word-in-corpus counter: a cheap commonness proxy (no frequency list ships in the repo). */
export function buildCommonness(texts: string[]): (word: string, min: number) => boolean {
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const m of t.match(/\p{L}+/gu) ?? []) {
      const k = foldEsAccents(m.toLowerCase());
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return (word, min) => (counts.get(foldEsAccents(word.toLowerCase())) ?? 0) >= min;
}

const ES_COPY_FILES = [
  'translations/es.js',
  'lib/education/curriculum/data/es.json',
  'lib/practice/data/practiceRiddles.es.json',
  'lib/practice/data/wordHuntTargets.es.json',
  'data/wikipedia-words/es.json',
  'app/[locale]/connections/content.es.ts',
];

export function loadEsCommonness(): (word: string, min: number) => boolean {
  const root = join(__dirname, '../../..');
  return buildCommonness(ES_COPY_FILES.map((f) => readFileSync(join(root, f), 'utf8')));
}
