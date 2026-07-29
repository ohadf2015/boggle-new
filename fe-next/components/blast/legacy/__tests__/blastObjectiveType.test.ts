import { describe, it, expect } from 'vitest';
import type { BlastObjective } from '../types';

describe('BlastObjective new types', () => {
  it('accepts clear_jelly', () => {
    const o: BlastObjective = { type: 'clear_jelly', target: 6 };
    expect(o.type).toBe('clear_jelly');
  });
  it('accepts kill_cake', () => {
    const o: BlastObjective = { type: 'kill_cake', target: 1 };
    expect(o.type).toBe('kill_cake');
  });
  it('accepts stop_chocolate', () => {
    const o: BlastObjective = { type: 'stop_chocolate', target: 0 };
    expect(o.type).toBe('stop_chocolate');
  });
});
