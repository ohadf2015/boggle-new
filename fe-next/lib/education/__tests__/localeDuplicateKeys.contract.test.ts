/**
 * No locale branch may declare the same child object twice.
 *
 * A JS object literal keeps the LAST duplicate key, so a second
 * `"lesson": { ... }` block inside `education` silently deletes the first one.
 * Nothing errors, nothing warns, and `grep` still finds the strings in the
 * file — they are simply unreachable at runtime.
 *
 * That is exactly what happened: `education.lesson` was declared twice in all
 * six locales, and the losing block held 13 of FlashcardReview's strings
 * (`enrichingContent`, `autoPronounce`, `gotIt`, `dontKnow`, `pronounce`, …).
 * Students saw raw key paths, and the natural fix — "add the missing key" —
 * would have written into the dead block and changed nothing.
 *
 * This reads the locale files as TEXT, because the collision is invisible once
 * the module has been evaluated.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;

/**
 * Only the branches the education parity contract already covers. Other
 * branches have their own pre-existing collisions (`sealedBid.shareCard`,
 * `sealedBid.session`, `leaderboard.referral`) that belong to other owners;
 * failing on those here would block this suite on someone else's bug.
 */
const GUARDED_PARENTS = new Set(['education', 'teacher', 'student']);

const TOP_LEVEL = /^ {2}"([A-Za-z0-9_]+)": \{/;
const CHILD = /^ {4}"([A-Za-z0-9_]+)": \{/;

interface Collision {
  path: string;
  lines: number[];
}

function findCollisions(source: string): Collision[] {
  const lines = source.split('\n');
  const firstSeen = new Map<string, number>();
  const collisions = new Map<string, number[]>();
  let parent: string | null = null;

  lines.forEach((line, index) => {
    const top = line.match(TOP_LEVEL);
    if (top) {
      parent = top[1];
      return;
    }
    const child = line.match(CHILD);
    if (!child || !parent || !GUARDED_PARENTS.has(parent)) return;

    const path = `${parent}.${child[1]}`;
    const previous = firstSeen.get(path);
    if (previous === undefined) {
      firstSeen.set(path, index + 1);
      return;
    }
    const found = collisions.get(path) ?? [previous];
    found.push(index + 1);
    collisions.set(path, found);
  });

  return [...collisions.entries()].map(([path, lines]) => ({ path, lines }));
}

describe('locale files declare each guarded object once', () => {
  it('detects a collision when one is present', () => {
    // Guards the scanner: a silent regex change would make every case below
    // pass without checking anything.
    const sample = [
      '  "education": {',
      '    "lesson": {',
      '      "a": "1"',
      '    },',
      '    "lesson": {',
      '      "b": "2"',
      '    }',
      '  }',
    ].join('\n');
    expect(findCollisions(sample)).toEqual([{ path: 'education.lesson', lines: [2, 5] }]);
  });

  it('ignores same-named children under different parents', () => {
    const sample = [
      '  "education": {',
      '    "lesson": {',
      '      "a": "1"',
      '    }',
      '  },',
      '  "teacher": {',
      '    "lesson": {',
      '      "b": "2"',
      '    }',
      '  }',
    ].join('\n');
    expect(findCollisions(sample)).toEqual([]);
  });

  for (const locale of LOCALES) {
    it(`${locale} declares every education / teacher / student child once`, () => {
      const source = readFileSync(
        join(__dirname, '..', '..', '..', 'translations', `${locale}.js`),
        'utf8'
      );
      const collisions = findCollisions(source);
      const described = collisions.map((c) => `${c.path} at lines ${c.lines.join(' and ')}`);
      expect(
        described,
        `${locale}.js declares these twice; the later block silently wins and the earlier keys become unreachable`
      ).toEqual([]);
    });
  }
});
