import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { generatePuzzle, type ClueMap } from '../generate.runtime';
const pool = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-ohadfisher-git-boggle-new/c6bae98e-dfd4-4062-a4c1-03cb5b91daee/scratchpad/es-pool-probe.json','utf8')) as ClueMap;
describe('es 4x4 fill probe (high budget)', () => {
  it('high retry/steps', () => {
    let ok = 0;
    for (let seed = 1; seed <= 20; seed++) {
      if (generatePuzzle({ seed, locale: 'es', clues: pool, difficulty: 'hard', maxRetries: 400, maxStepsPerAttempt: 40000 })) ok += 1;
    }
    console.log(`es 4x4 high-budget fill: ${ok}/20`);
    expect(ok).toBeGreaterThanOrEqual(0);
  });
});
