import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The practice loop moved out of PageClient and into `PracticeContent`, which
 * mounts `EducationShell` — so the viewport contract this file guards now lives
 * across those two files rather than in the page shell. The behaviour asserted
 * is unchanged: while a drill is playing, the document never scrolls, the XP
 * bar is an in-flow shrink-0 strip rather than a `fixed` overlay with a `pt-16`
 * spacer beneath it, and exactly one inner region takes the overflow.
 */
const pageClient = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');
const practiceContent = readFileSync(resolve(__dirname, '../PracticeContent.tsx'), 'utf8');
const shell = readFileSync(
  resolve(__dirname, '../../../../../../components/education/shell/EducationShell.tsx'),
  'utf8',
);

describe('student lesson PageClient — active-drill viewport', () => {
  it('wraps an active drill in a fixed-viewport flex column', () => {
    // The shell root: viewport height, and it refuses to grow the page.
    expect(shell).toMatch(/h-dvh/);
    expect(shell).toMatch(/overflow-hidden/);
    expect(shell).toMatch(/flex-col/);
    // Exactly one region inside it scrolls.
    expect(shell).toMatch(/min-h-0 flex-1 overflow-y-auto/);
    // The XP bar is a header slot in that column, not a layer over it.
    expect(practiceContent).toMatch(/<EducationShell/);
    expect(practiceContent).toMatch(/shrink-0/);
  });

  it('does not pin the XP header with a fixed overlay plus pt-16 spacer', () => {
    for (const source of [pageClient, practiceContent]) {
      expect(source).not.toMatch(/className="fixed top-0 left-0 right-0 z-50/);
      expect(source).not.toMatch(/className=\{cn\('pt-16'/);
    }
  });
});
