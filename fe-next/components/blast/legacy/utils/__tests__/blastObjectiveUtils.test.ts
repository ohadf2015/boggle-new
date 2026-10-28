/**
 * blastObjectiveUtils — tests for objective helper functions.
 */
import { formatObjectiveLabel } from '../blastObjectiveUtils';
import type { BlastObjective } from '../../types';

describe('formatObjectiveLabel', () => {
  const mockT = (key: string) => {
    const map: Record<string, string> = {
      'blast.objective.scoreTarget': 'Score {target} points',
      'blast.objective.collectType': 'Collect {target} {tileType} tiles',
      'blast.objective.wordLength': 'Find {target} words with {minWordLength}+ letters',
      'blast.objective.clearPercent': 'Clear {target}% of the board',
      'blast.objective.targetWord': 'Find: {word}',
      // The formatter now reads tile names from the existing tile-guide
      // translations so non-English UIs don't leak raw English type ids
      // (e.g. "אסוף 4 bomb"). Cover the keys it asks for.
      'blast.tileGuide.bomb.name': 'bomb',
      'blast.tileGuide.gold.name': 'coin',
      'blast.tileGuide.diamond.name': 'diamond',
    };
    return map[key] || key;
  };

  it('formats score_target objective', () => {
    const obj: BlastObjective = { type: 'score_target', target: 50 };
    expect(formatObjectiveLabel(obj, mockT)).toBe('Score 50 points');
  });

  it('formats collect_type objective', () => {
    const obj: BlastObjective = { type: 'collect_type', tileType: 'bomb', target: 4 };
    expect(formatObjectiveLabel(obj, mockT)).toBe('Collect 4 bomb tiles');
  });

  it('formats word_length objective', () => {
    const obj: BlastObjective = { type: 'word_length', target: 2, minWordLength: 5 };
    expect(formatObjectiveLabel(obj, mockT)).toBe('Find 2 words with 5+ letters');
  });

  it('formats clear_percent objective', () => {
    const obj: BlastObjective = { type: 'clear_percent', target: 90 };
    expect(formatObjectiveLabel(obj, mockT)).toBe('Clear 90% of the board');
  });

  it('formats target_word objective', () => {
    const obj: BlastObjective = { type: 'target_word', target: 1, targetWord: 'crystal' };
    expect(formatObjectiveLabel(obj, mockT)).toBe('Find: CRYSTAL');
  });

  it('uppercases target word in label', () => {
    const obj: BlastObjective = { type: 'target_word', target: 1, targetWord: 'hello' };
    expect(formatObjectiveLabel(obj, mockT)).toBe('Find: HELLO');
  });
});
