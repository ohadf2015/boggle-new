import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
      expect(source).toMatch(/h-full min-h-0 flex flex-col|DRILL_ROOT_CLASS/);
    });
  }

  it('WordTowerPractice fits a sized parent', () => {
    const source = readFileSync(
      resolve(__dirname, '../../education/practicePicker/WordTowerPractice.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/min-h-screen/);
    expect(source).toMatch(/h-full min-h-0 flex flex-col|DRILL_ROOT_CLASS/);
  });
});
