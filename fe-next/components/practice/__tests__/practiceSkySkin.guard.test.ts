import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { classLiterals } from '../../../scripts/edu-sky-codemod.mjs';

const REPO = path.resolve(__dirname, '../../..');
const DIR = path.join(REPO, 'components/practice');

const sources = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(full);
    return /\.tsx?$/.test(e.name) ? [path.relative(REPO, full)] : [];
  });

const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');
// Main-game surfaces (daily, solo) import these; they never render in a classroom.
const MAIN_GAME = new Set(['PracticeBadge.tsx', 'PracticeCoachTip.tsx', 'PracticeChainCta.tsx']);
const files = sources(DIR);
const classroomFiles = files.filter((f) => !MAIN_GAME.has(path.basename(f)));
const classes = (lit: string) => lit.split(/\s+/).filter(Boolean);

// The drills are shared with dark pages (SEO word lists), so the sky look may only
// come from the edu-sky: variant, which applies under data-edu-theme="sky" alone.
describe('practice stage sky skin', () => {
  it('scans the practice sources', () => {
    expect(files.length).toBeGreaterThan(25);
  });

  it('uses edu tokens only behind the edu-sky variant, so dark pages render as before', () => {
    const offenders: string[] = [];
    for (const rel of files) {
      for (const lit of classLiterals(read(rel), rel)) {
        for (const c of classes(lit)) {
          if (/(^|:)[a-z-]+-edu-/.test(c) && !c.startsWith('edu-sky:')) offenders.push(`${rel}: ${c}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('gives every dark navy surface, light ink and accent ink a sky twin', () => {
    const dark = /^((?:[a-z0-9@[\]-]+:)*)(bg-neo-navy(-light)?(\/\d+)?|text-neo-(white|cream)(\/\d+)?|border-neo-cream(\/\d+)?|text-neo-(lime|cyan|yellow|pink|orange|purple))$/;
    const solidFill = /(^|\s)(bg-neo-(pink|purple|red|black|cyan|lime|yellow|orange|green)|bg-black)(\s|$)/;
    const offenders: string[] = [];
    for (const rel of classroomFiles) {
      for (const lit of classLiterals(read(rel), rel)) {
        const all = classes(lit);
        const twinned = (c: string) => all.some((o) => o.startsWith('edu-sky:') && o.split(':').slice(1, -1).join(':') === c.split(':').slice(0, -1).join(':') && o.split(':').pop()!.split('-')[0] === c.split(':').pop()!.split('-')[0]);
        const hits = all.filter((c) => dark.test(c) && !twinned(c) && !(solidFill.test(lit) && /text-|:bg-/.test(c)));
        if (hits.length) offenders.push(`${rel}: ${hits.join(' ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('drops the dark stage glow under the sky scope', () => {
    const spelling = read('components/practice/SpellingChallengePractice.tsx');
    expect(spelling).toMatch(/backgroundImage: `var\(--practice-stage-art, /);
    expect(spelling).toMatch(/edu-sky:\[--practice-stage-art:none\]/);
  });
});
