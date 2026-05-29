import { describe, it, expect } from 'vitest';
import { resolveBlastVersion } from '../blastVersionSelect';

describe('resolveBlastVersion', () => {
  it('defaults to v1 — the only version players see', () => {
    expect(resolveBlastVersion(undefined)).toBe('v1');
    expect(resolveBlastVersion({})).toBe('v1');
  });

  it('stays v1 for any non-opt-in value', () => {
    expect(resolveBlastVersion({ v2: '' })).toBe('v1');
    expect(resolveBlastVersion({ v2: 'off' })).toBe('v1');
    expect(resolveBlastVersion({ v2: 'true' })).toBe('v1');
    expect(resolveBlastVersion({ v2: '1' })).toBe('v1');
  });

  it('opts into v2 only with the explicit ?v2=on flag', () => {
    expect(resolveBlastVersion({ v2: 'on' })).toBe('v2');
  });
});
