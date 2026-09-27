import { describe, it, expect } from 'vitest';
import { classifyOvation } from '../ovation';

describe('ovation tier classification', () => {
  it('depth 0: none (no cascade)', () => {
    expect(classifyOvation(0)).toBe('none');
  });

  it('depth 1: none (first cascade alone is not a chain)', () => {
    expect(classifyOvation(1)).toBe('none');
  });

  it('depth 2: small ovation', () => {
    expect(classifyOvation(2)).toBe('small');
  });

  it('depth 3: big ovation', () => {
    expect(classifyOvation(3)).toBe('big');
  });

  it('depth 4: big ovation', () => {
    expect(classifyOvation(4)).toBe('big');
  });

  it('depth 5+: mega ovation', () => {
    expect(classifyOvation(5)).toBe('mega');
    expect(classifyOvation(10)).toBe('mega');
  });
});
