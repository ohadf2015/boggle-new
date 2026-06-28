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

/**
 * Authoritative Swedish corpus the runtime actually validates against
 * (@arvidbt/swedish-words, ~410k words), parsed the same way as
 * backend/dictionaryLoaders.ts. Used as the detector reference so that
 * legitimately-ASCII non-nouns (han, som, har, …) are recognized as real words
 * and never mistaken for diacritic-stripped artifacts. Falls back to the
 * noun list if the package is unavailable.
 */
function loadReferenceCorpus(): string[] {
  for (const rel of [
    '../node_modules/@arvidbt/swedish-words/out/index.js',
    'node_modules/@arvidbt/swedish-words/out/index.js',
  ]) {
    try {
      const content = readFileSync(path.join(BACKEND_DIR, rel), 'utf8');
      const arr = content.match(/var swedish_words = \[([\s\S]*?)\];/);
      if (!arr) continue;
      const decode = (s: string): string =>
        s.replace(/\\x([0-9A-Fa-f]{2})/g, (_m, hex) =>
          String.fromCharCode(parseInt(hex, 16)),
        );
      const words: string[] = [];
      for (const tok of arr[1].split(',')) {
        const t = tok.trim();
        if (!t.startsWith('"') || !t.endsWith('"')) continue;
        try {
          words.push((JSON.parse(decode(t)) as string).toLowerCase());
        } catch {
          /* skip unparseable token */
        }
      }
      if (words.length > 0) return words;
    } catch {
      /* try next path */
    }
  }
  // Fallback: noun list only (still catches the corruption, may be less precise)
  return readWordList('sv_nouns.txt');
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

describe('honors the legitimate fold-collision allowlist', () => {
  it('does not flag allowlisted names/loanwords that fold onto å/ä/ö words', () => {
    // 'aten' (Athens) folds onto 'äten'; 'lars' onto 'lärs' — both legitimate.
    const reference = ['äten', 'lärs', 'äventyr'];
    const approved = ['aten', 'lars', 'aventyr'];
    const artifacts = findDiacriticStrippedSwedishWords(approved, reference);
    // Only the genuine artifact 'aventyr' (→ äventyr) survives.
    expect(artifacts.map((a) => a.stripped)).toEqual(['aventyr']);
  });
});

describe('Swedish word data is free of diacritic-stripped artifacts', () => {
  const reference = loadReferenceCorpus();

  for (const file of [
    'swedish_words_approved.txt',
    'dictionary/candidates/sv.txt',
  ]) {
    it(`${file} contains no ASCII-folded forms of real å/ä/ö words`, () => {
      const artifacts = findDiacriticStrippedSwedishWords(
        readWordList(file),
        reference,
      );
      const report = artifacts
        .map((a) => `  ${a.stripped} -> ${a.suggestions.join('/')}`)
        .join('\n');
      expect(
        artifacts,
        `Diacritic-stripped Swedish words found in ${file}.\n` +
          `Å/Ä/Ö are distinct letters. Remove the stripped form, or — if it is a\n` +
          `legitimate name/loanword — add it to KNOWN_FOLD_COLLISIONS:\n${report}`,
      ).toEqual([]);
    });
  }

  it('rejects every reported SÖNDAG-bug / corruption case', () => {
    const approved = new Set(
      readWordList('swedish_words_approved.txt').map((w) => w.toLowerCase()),
    );
    const candidates = new Set(
      readWordList('dictionary/candidates/sv.txt').map((w) => w.toLowerCase()),
    );
    // ASCII non-words that must never be accepted in place of the real spelling.
    const bad = [
      'sondag', 'mandag', 'lordag', 'pask', 'nasa', 'glogg', // first pass
      'aventyr', 'forsta', 'lasa', 'onskningar', 'underhallning', 'upptack',
      'forr', 'paskbord', 'nyarsloften', 'feststamning', // comprehensive pass
    ];
    for (const w of bad) {
      expect(approved.has(w), `"${w}" must not be an approved word`).toBe(false);
    }
    expect(candidates.has('andrande')).toBe(false);
  });
});
