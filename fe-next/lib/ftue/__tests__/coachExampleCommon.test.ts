import { describe, it, expect } from 'vitest';
import { pickCoachExampleWord } from '../mpStuckCoach';

describe('pickCoachExampleWord', () => {
  it('Given an everyday word on the board, Then it is suggested before an obscure easy one', () => {
    expect(pickCoachExampleWord({ common: ['cat'], easy: ['fei', 'ecu'], medium: [], hard: [] })).toBe('cat');
  });

  it('Given no everyday word, Then it falls back to the easy list', () => {
    expect(pickCoachExampleWord({ common: [], easy: ['ooh'], medium: [], hard: [] })).toBe('ooh');
  });
});
