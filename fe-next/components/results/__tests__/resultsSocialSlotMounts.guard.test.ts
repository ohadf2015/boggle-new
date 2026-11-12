import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

/** Every results screen mounts the one social slot (name prompt, record, rival, next unlock + level-up watcher). */
const MOUNTS: Array<[file: string, mode: string]> = [
  ['components/daily/results/DailyResultsHero.tsx', 'daily'],
  ['components/quick-play/QuickPlayResults.tsx', 'quickPlay'],
  ['components/multiplayer/results/MpResultsStage.tsx', 'multiplayer'],
  ['components/singleplayer/SinglePlayerResults.tsx', 'single'],
  ['components/blast/legacy/BlastResultsSummary.tsx', 'blast'],
  ['components/wordTowerV2/V2RunResults.tsx', 'tower'],
  ['components/education/live/EduStudentResults.tsx', 'edu'],
];

describe('ResultsSocialSlot is mounted on every results screen', () => {
  it.each(MOUNTS)('%s mounts it for %s', (file, mode) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    expect(src).toMatch(new RegExp(`<ResultsSocialSlot\\s+mode="${mode}"`));
  });

  it.each(MOUNTS.filter(([, mode]) => mode !== 'edu'))('%s feeds the XP moment an xp prop', (file) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const start = src.indexOf('<ResultsSocialSlot');
    const tag = src.slice(start, src.indexOf('/>', start));
    expect(tag).toMatch(/\bxp=\{/);
    expect(tag).not.toMatch(/\bxp=\{\s*null\s*\}/);
  });
});

describe('every results XP key has a publisher', () => {
  const files = execSync('git ls-files -- components app hooks lib', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(f => /\.tsx?$/.test(f) && !f.includes('__tests__'));
  const sources = files.map(f => readFileSync(join(ROOT, f), 'utf8'));
  const published = new Set(
    sources
      .filter(src => /publish(ResultsXp|XpResponse)\(/.test(src))
      .flatMap(src => [...src.matchAll(/publish(?:ResultsXp|XpResponse)\(\s*'([^']+)'/g)].map(m => m[1])),
  );
  const heroModes = [...new Set(sources.flatMap(src => [...src.matchAll(/<DailyResultsHero\b[^>]*?\smode="([^"]+)"/g)].map(m => `daily:${m[1]}`)))];
  const literalKeys = [...new Set(sources.flatMap(src => [...src.matchAll(/useResultsXp\(\s*'([^']+)'/g)].map(m => m[1])))];

  it('finds the daily heroes', () => {
    expect(heroModes.length).toBeGreaterThanOrEqual(4);
  });

  it.each([...heroModes, ...literalKeys])('%s is published by a server response', (key) => {
    expect(published).toContain(key);
  });
});
