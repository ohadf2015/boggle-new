import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A drill root must size itself against the box it is GIVEN, never against the
 * page. `min-h-screen` does the latter: it grows the document behind the
 * education shell, which is what put the XP bar, the score and the finish
 * button off the bottom of a 390x844 phone.
 *
 * Two roots satisfy that, and both ship:
 *   - `DRILL_ROOT_CLASS` — `h-full min-h-0 flex flex-col overflow-hidden`, for
 *     a drill that manages its own internal scroller (the word list, warmup's
 *     grid, the tower wheel).
 *   - `min-h-full` — fill the shell's one scroll region and let THAT region
 *     scroll when a card overflows it. `EducationShell` is `h-dvh` +
 *     `overflow-hidden` with a single `min-h-0 flex-1 overflow-y-auto` child,
 *     so the page still cannot grow.
 *
 * `h-full` on its own is deliberately NOT accepted here: it appears on progress
 * bars and fills all over these files and would make this assertion vacuous.
 */
const FITS_A_SIZED_PARENT = /DRILL_ROOT_CLASS|h-full min-h-0 flex flex-col|min-h-full/;

const DRILLS = [
  'FlashcardReview.tsx',
  'SoloPracticeBoard.tsx',
  'WarmupRound.tsx',
  'TimedBlitzPractice.tsx',
  'WordMatchingPractice.tsx',
  'SpellingChallengePractice.tsx',
  'VocabFocusPractice.tsx',
  'WordListPreview.tsx',
] as const;

describe('active-drill containers fit a sized parent instead of min-h-screen', () => {
  for (const file of DRILLS) {
    it(`${file} no longer uses min-h-screen`, () => {
      const source = readFileSync(resolve(__dirname, '..', file), 'utf8');
      expect(source).not.toMatch(/min-h-screen/);
      expect(source).toMatch(FITS_A_SIZED_PARENT);
    });
  }

  it('WordTowerPractice fits a sized parent', () => {
    const source = readFileSync(
      resolve(__dirname, '../../education/practicePicker/WordTowerPractice.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/min-h-screen/);
    expect(source).toMatch(FITS_A_SIZED_PARENT);
  });
});
