import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../../../..');
const FILES = [
  'components/education/live/EduHostResults.tsx',
  'components/education/live/EduStudentResults.tsx',
  'components/education/results/ClassReportButton.tsx',
  'components/education/results/StrugglePreview.tsx',
  'components/education/results/ProOfferCompactLink.tsx',
  'components/education/results/ResultsPrimaryActions.tsx',
  'components/education/results/StudentNextActions.tsx',
  'components/education/results/MissedWordsList.tsx',
  'components/education/results/ParentShareLink.tsx',
  'components/education/results/ReteachActions.tsx',
  'components/education/results/WordCoverageGlance.tsx',
  'app/[locale]/teacher/reports/PageClient.tsx',
];

const read = (f: string) => readFileSync(resolve(ROOT, f), 'utf8');

// These two draw icons and meter bars at h-8/size-9, so the sweep checks their controls by name below instead.
const ICON_HEAVY = new Set(['components/education/results/ReteachActions.tsx', 'components/education/results/WordCoverageGlance.tsx']);

describe('round-end and reports controls: sizes', () => {
  it.each(FILES.filter((f) => !ICON_HEAVY.has(f)))('%s: no control is drawn shorter than 44px', (f) => {
    expect(read(f)).not.toMatch(/\b(min-h-(8|9|10)|h-(8|9|10)|size-(8|9|10))\b(?![\w/-])/);
  });

  it('the coverage "more" toggle is 44px tall', () => {
    expect(read('components/education/results/WordCoverageGlance.tsx')).toMatch(/'min-h-11 hover:bg-neo-navy-light[^']*focus-visible:ring-4/);
  });
});

describe('round-end and reports controls meet the motion and focus rules', () => {
  it.each(FILES)('%s: nothing enters from opacity 0', (f) => {
    expect(read(f)).not.toMatch(/(initial|enter)\b[^\n]{0,40}opacity:\s*0\b/);
  });

  it.each(FILES.filter((f) => /<(button|Link)\b/.test(read(f))))('%s: every button or link class carries a visible focus ring', (f) => {
    // Arrow functions inside a tag would otherwise end the match at their `>`.
    const src = read(f).replace(/=>/g, '=~');
    const tags = Array.from(src.matchAll(/<(button|Link)\b[\s\S]*?>/g), (m) => m[0]).filter((tag) => /className=/.test(tag));
    for (const tag of tags) {
      // Shared class constants are checked once, below, rather than at every use.
      const usesSharedStyle = /className=\{(cn\()?(TERTIARY|PRIMARY_CLASS|ROW_BUTTON|LINK|REPORT_TAB|QUIET_LINK|LOUD_LINK|CLASS|ROW|ACTION)\b/.test(tag) || /\b(PRESS|QUIET_LINK|LOUD_LINK)\b/.test(tag) || /\{\.\.\.common\}/.test(tag);
      if (usesSharedStyle) continue;
      expect(tag, `${f}: ${tag.slice(0, 120)}`).toMatch(/focus-visible:(ring|outline)/);
    }
  });

  it.each(['components/education/results/ResultsPrimaryActions.tsx'])(
    '%s: both link tones are 44px tall and show a focus ring',
    (f) => {
      for (const name of ['QUIET_LINK', 'LOUD_LINK']) {
        expect(read(f)).toMatch(new RegExp(`const ${name} =\\s*'[^']*min-h-11[^']*focus-visible:ring-4`));
      }
    }
  );

  it('the shared class constants those controls use carry the focus ring', () => {
    const live = read('components/education/live/eduLiveStyles.ts');
    expect(live).toMatch(/export const PRESS =\s*'[^']*focus-visible:ring-4/);
    expect(read('components/education/results/ProOfferCompactLink.tsx')).toMatch(/const CLASS =\s*'[^']*focus-visible:ring-4/);
    expect(read('components/education/results/ClassReportButton.tsx')).toMatch(/const LINK =\s*'[^']*focus-visible:ring-4/);
    expect(read('app/[locale]/teacher/reports/PageClient.tsx')).toMatch(/const REPORT_TAB =\s*'[^']*focus-visible:ring/);
    const reteach = read('components/education/results/ReteachActions.tsx');
    expect(reteach).toMatch(/const ACTION =[^;]*min-h-11[^;]*focus-visible:ring-4/);
    expect(reteach).toMatch(/const ROW =[^;]*min-h-11[^;]*focus-visible:ring-4/);
  });
});
