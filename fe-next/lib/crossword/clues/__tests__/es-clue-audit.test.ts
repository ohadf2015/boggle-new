import { describe, it } from 'vitest';
import { evaluateEsClue } from '../evaluateSvClue';
import esBank from '../../data/clueBank.es.json';

describe('Spanish clue bank quality audit', () => {
  it('evaluates all clues and reports metrics', () => {
    const results = {
      excellent: [] as Array<{ answer: string; clue: string; score: number }>,
      good: [] as Array<{ answer: string; clue: string; score: number }>,
      fair: [] as Array<{ answer: string; clue: string; score: number }>,
      poor: [] as Array<{ answer: string; clue: string; score: number }>,
      totalScore: 0,
      total: 0,
    };

    for (const [answer, entry] of Object.entries(esBank)) {
      const clue = (entry as any).clue;
      const evalResult = evaluateEsClue(answer, clue);
      const score = evalResult.score;

      results.totalScore += score;
      results.total++;

      if (score >= 0.85) results.excellent.push({ answer, clue, score });
      else if (score >= 0.7) results.good.push({ answer, clue, score });
      else if (score >= 0.5) results.fair.push({ answer, clue, score });
      else results.poor.push({ answer, clue, score });
    }

    const avgScore = (results.totalScore / results.total).toFixed(2);

    console.log('\n=== Spanish Clue Bank Quality Metrics ===');
    console.log(`Total: ${results.total}`);
    console.log(`Average: ${avgScore}`);
    console.log(`Excellent (0.85+): ${results.excellent.length}`);
    console.log(`Good (0.7-0.84): ${results.good.length}`);
    console.log(`Fair (0.5-0.69): ${results.fair.length}`);
    console.log(`Poor (<0.5): ${results.poor.length}`);

    console.log('\n=== Poor Clues ===');
    results.poor.forEach((item) => {
      console.log(`  ${item.answer}: "${item.clue}" (${item.score})`);
    });
  });
});
