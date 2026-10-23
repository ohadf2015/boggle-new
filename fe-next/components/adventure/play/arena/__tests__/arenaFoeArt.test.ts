import { describe, it, expect } from 'vitest';
import { pickFoeFrame } from '../arenaFoeArt';

const all = { attack: true, enraged: true };

describe('pickFoeFrame', () => {
  it('shows the hurt frame while hurt or dead, whatever else is loaded', () => {
    expect(pickFoeFrame('hurt', 2, all)).toBe('hurt');
    expect(pickFoeFrame('dead', 0, all)).toBe('hurt');
  });

  it('shows the attack frame during the wind-up and the lunge', () => {
    expect(pickFoeFrame('windup', 0, all)).toBe('attack');
    expect(pickFoeFrame('lunge', 1, all)).toBe('attack');
  });

  it('shows the enraged frame at rest only in the last phase', () => {
    expect(pickFoeFrame('idle', 1, all)).toBe('idle');
    expect(pickFoeFrame('idle', 2, all)).toBe('enraged');
  });

  it('falls back to idle for frames that are not loaded (yet)', () => {
    expect(pickFoeFrame('windup', 0, { attack: false, enraged: false })).toBe('idle');
    expect(pickFoeFrame('idle', 2, { attack: true, enraged: false })).toBe('idle');
  });
});
