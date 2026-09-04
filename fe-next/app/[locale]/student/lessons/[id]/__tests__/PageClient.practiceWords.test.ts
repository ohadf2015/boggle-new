import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Solo practice must draw its words from `usePracticeWords` (level-filtered), not
 * raw `lesson.words`, or a support student is quizzed on challenge-tier words the
 * teacher deliberately kept off their list.
 */
const source = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

describe('student lesson PageClient — practice words are level-filtered', () => {
  it('derives practice words through usePracticeWords', () => {
    expect(source).toMatch(/usePracticeWords\(/);
  });

  it('never hands raw lesson.words to a practice mode or the mode selector', () => {
    expect(source).not.toMatch(/words=\{lesson\.words\}/);
    expect(source).not.toMatch(/words:\s*lesson\.words\b/);
    expect(source).not.toMatch(/wordCount=\{lesson\.words/);
  });
});
