/**
 * "No page scroll during play" is a layout contract, and jsdom cannot see it:
 * it has no layout engine, so a `min-h-screen` root and a `min-h-full` root
 * render identically in a component test and the regression ships green.
 *
 * The contract has exactly two halves, and both are visible in the source:
 *
 *  1. The lesson page must mount the playing state inside `EducationShell`
 *     (`h-dvh` + `overflow-hidden` + the body lock) rather than the old
 *     `position: fixed` XP header with a `pt-16` spacer under it, which left
 *     the document itself growing behind a floating bar.
 *  2. No practice mode may force its root taller than the shell. `min-h-screen`
 *     / `min-h-dvh` inside a locked shell guarantees the inner region overflows
 *     by exactly the height of the header, on every mode, forever.
 *
 * So this test reads the files. It is a lint rule that lives with its feature,
 * and it is the only place either half can be asserted before a human opens a
 * phone.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..', '..');

const MODE_FILES = [
  'components/practice/FlashcardReview.tsx',
  'components/practice/SoloPracticeBoard.tsx',
  'components/practice/WordMatchingPractice.tsx',
  'components/practice/SpellingChallengePractice.tsx',
  'components/practice/TimedBlitzPractice.tsx',
  'components/practice/VocabFocusPractice.tsx',
  'components/education/practicePicker/WordTowerPractice.tsx',
];

const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('practice surfaces never grow the page', () => {
  it.each(MODE_FILES)('%s has no viewport-height root', (file) => {
    const source = read(file);
    expect(source).not.toMatch(/min-h-screen/);
    expect(source).not.toMatch(/min-h-dvh/);
    expect(source).not.toMatch(/\bh-screen\b/);
  });

  it('the lesson page plays inside the locked education shell', () => {
    const source = read('app/[locale]/student/lessons/[id]/PageClient.tsx');
    expect(source).toContain('EducationShell');
    // The old floating XP bar: a fixed header plus a hand-tuned spacer.
    expect(source).not.toMatch(/fixed top-0 left-0 right-0/);
    expect(source).not.toMatch(/className="pt-16"/);
  });
});
