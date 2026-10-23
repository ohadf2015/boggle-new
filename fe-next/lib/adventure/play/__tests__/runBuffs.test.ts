import { describe, it, expect } from 'vitest';
import { runBuffs } from '../runBuffs';

describe('runBuffs', () => {
  it('is empty with no stat relics', () => {
    expect(runBuffs([])).toEqual([]);
    expect(runBuffs(['sharp-quill'])).toEqual([]);
  });
  it('lists the time bonus and gold multiplier the run has built up', () => {
    expect(runBuffs(['hourglass', 'gold-tooth'])).toEqual([
      { id: 'hourglass', kind: 'time', text: '+10s' },
      { id: 'gold-tooth', kind: 'gold', text: '×1.5' },
    ]);
  });
});
