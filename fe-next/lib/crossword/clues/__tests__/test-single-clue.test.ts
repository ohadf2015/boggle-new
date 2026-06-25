import { describe, it, expect } from 'vitest';
import { evaluateSvClue } from '../evaluateSvClue';

describe('single clue test', () => {
  it('evaluates unga clue', () => {
    const result = evaluateSvClue('unga', 'De som inte är gamla ännu');
    console.log('=== CLUE EVALUATION ===');
    console.log(`Answer: "unga"`);
    console.log(`Clue: "De som inte är gamla ännu"`);
    console.log(`Score: ${result.score}`);
    console.log(`Reason: ${result.reason}`);
    expect(result).toBeDefined();
  });
});
