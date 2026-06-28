import { readFileSync } from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import {
  foldSwedishDiacritics,
  findDiacriticStrippedSwedishWords,
} from '../swedishDiacriticGuard';

const BACKEND_DIR = path.join(__dirname, '..', '..');

function readWordList(relPath: string): string[] {
  return readFileSync(path.join(BACKEND_DIR, relPath), 'utf8')
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !w.startsWith('#'));
}

describe('foldSwedishDiacritics', () => {
  it('folds å/ä/ö to their ASCII look-alikes', () => {
    expect(foldSwedishDiacritics('SÖNDAG')).toBe('sondag');
    expect(foldSwedishDiacritics('måndag')).toBe('mandag');
    expect(foldSwedishDiacritics('påsk')).toBe('pask');
    expect(foldSwedishDiacritics('näsa')).toBe('nasa');
  });
});

describe('findDiacriticStrippedSwedishWords', () => {
  it('flags an ASCII entry whose real form carries å/ä/ö', () => {
    const reference = ['söndag', 'måndag', 'hund', 'katt'];
    const approved = ['sondag', 'mandag', 'hund'];
    const artifacts = findDiacriticStrippedSwedishWords(approved, reference);
    const stripped = artifacts.map((a) => a.stripped).sort();
    expect(stripped).toEqual(['mandag', 'sondag']);
    expect(artifacts.find((a) => a.stripped === 'sondag')?.suggestions).toEqual([
      'söndag',
    ]);
  });

  it('does NOT flag legitimately ASCII Swedish words', () => {
    // `son` is a real Swedish word; it must not be flagged even though `sön`
    // would fold to it. Only entries with NO valid ASCII form are artifacts.
    const reference = ['son', 'söndag', 'bil', 'hund'];
    const approved = ['son', 'bil', 'hund'];
    expect(findDiacriticStrippedSwedishWords(approved, reference)).toEqual([]);
  });

  it('treats Å, Ä and Ö as distinct letters — never soft-matches O to Ö', () => {
    const reference = ['röd', 'rod-byggnad'.split('-')[0]]; // 'röd' valid, 'rod' not
    const approved = ['rod'];
    const artifacts = findDiacriticStrippedSwedishWords(approved, ['röd']);
    expect(artifacts).toEqual([{ stripped: 'rod', suggestions: ['röd'] }]);
  });
});

describe('swedish_words_approved.txt is free of diacritic-stripped artifacts', () => {
  it('contains no ASCII-folded forms of real å/ä/ö Swedish words', () => {
    const approved = readWordList('swedish_words_approved.txt');
    const reference = readWordList('sv_nouns.txt');
    const artifacts = findDiacriticStrippedSwedishWords(approved, reference);
    const report = artifacts
      .map((a) => `  ${a.stripped} -> ${a.suggestions.join('/')}`)
      .join('\n');
    expect(
      artifacts,
      `Diacritic-stripped Swedish words found in swedish_words_approved.txt.\n` +
        `Å/Ä/Ö are distinct letters — these ASCII forms must be removed or fixed:\n${report}`,
    ).toEqual([]);
  });

  it('rejects the reported "SÖNDAG bug" cases', () => {
    const approved = new Set(
      readWordList('swedish_words_approved.txt').map((w) => w.toLowerCase()),
    );
    // These ASCII non-words must never be accepted in place of the real word.
    for (const bad of ['sondag', 'mandag', 'lordag', 'pask', 'nasa', 'glogg']) {
      expect(approved.has(bad), `"${bad}" must not be an approved word`).toBe(
        false,
      );
    }
  });
});
