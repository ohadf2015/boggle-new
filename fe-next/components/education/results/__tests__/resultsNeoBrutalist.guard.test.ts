import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../../..');

const RESULTS_FILES = [
  ...fs
    .readdirSync(path.join(ROOT, 'components/education/results'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `components/education/results/${f}`),
  ...fs
    .readdirSync(path.join(ROOT, 'components/education/economy'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `components/education/economy/${f}`),
  'components/education/live/EduHostResults.tsx',
  'components/education/live/EduStudentResults.tsx',
  'components/education/live/EduStudentProgress.tsx',
  'components/education/live/EduStudentShareButton.tsx',
  'components/education/live/EduMissedRecall.tsx',
  'components/education/boss/BossOutcomeCard.tsx',
  'components/education/ClassroomResultsCard.tsx',
  'components/education/ClassroomResultsCardSteps.tsx',
  'components/education/ClassroomResultsCardStepViews.tsx',
];

const SOFT: Array<[string, RegExp]> = [
  ['gradient', /gradient\(|\bbg-(?:gradient|linear|radial|conic)-/],
  ['blur', /\b(?:backdrop-)?blur(?:-[a-z0-9]+)?\b(?![a-z])/],
  ['soft rounding', /\brounded-(?:2xl|3xl)\b/],
  ['faint edge', /\bborder-neo-cream\/[1-4]0\b/],
  ['wash fill', /\bbg-neo-[a-z]+\/(?:5|10|15)\b/],
  ['raw hex', /#[0-9a-fA-F]{6}\b/],
];

function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('round-end results screens are neo-brutalist', () => {
  it.each(RESULTS_FILES)('%s has no gradients, blur, soft rounding, faint edges, wash fills or raw hex', (file) => {
    const src = codeOnly(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    const hits = SOFT.filter(([, re]) => re.test(src)).map(([name]) => name);
    expect(hits).toEqual([]);
  });
});
