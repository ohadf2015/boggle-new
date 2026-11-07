// Regenerates lib/wordleSolver/benchmark.json: npx tsx scripts/wordle-benchmark.ts
import { writeFileSync } from 'node:fs';
import { solve, OPENER } from '../lib/wordleSolver/solver';
import { WORDLE_ANSWERS } from '../lib/wordleSolver/answers';

const distribution: Record<string, number> = {};
let total = 0;
for (const answer of WORDLE_ANSWERS) {
  const n = solve(answer).length;
  total += n;
  distribution[n] = (distribution[n] ?? 0) + 1;
}
const result = {
  games: WORDLE_ANSWERS.length,
  average: Number((total / WORDLE_ANSWERS.length).toFixed(2)),
  solvedInSix: WORDLE_ANSWERS.length - Object.entries(distribution).filter(([n]) => Number(n) > 6).reduce((a, [, c]) => a + c, 0),
  opener: OPENER,
  distribution,
};
writeFileSync(new URL('../lib/wordleSolver/benchmark.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(result);
