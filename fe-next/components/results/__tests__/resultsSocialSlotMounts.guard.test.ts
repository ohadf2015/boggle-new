import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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
});
