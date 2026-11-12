import { describe, it, expect } from 'vitest';
import { idlePhase, IDLE_PEEK_MS, IDLE_DOZE_MS } from '../idle';

describe('idlePhase', () => {
  it('stays awake before 20s without a word', () => {
    expect(IDLE_PEEK_MS).toBe(20_000);
    expect(idlePhase(1000, 1000 + IDLE_PEEK_MS - 1)).toBe('awake');
  });

  it('peeks in at 20s, then dozes', () => {
    expect(idlePhase(0, IDLE_PEEK_MS)).toBe('peek');
    expect(IDLE_DOZE_MS).toBeGreaterThan(IDLE_PEEK_MS);
    expect(idlePhase(0, IDLE_DOZE_MS)).toBe('doze');
    expect(idlePhase(0, IDLE_DOZE_MS + 60_000)).toBe('doze');
  });

  it('treats a clock that went backwards as awake', () => {
    expect(idlePhase(5000, 1000)).toBe('awake');
  });
});
