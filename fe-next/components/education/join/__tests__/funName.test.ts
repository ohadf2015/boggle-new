import { describe, it, expect } from 'vitest';
import { pickFunName } from '../funName';

describe('pickFunName', () => {
  it('picks from a |-separated list, never the current name', () => {
    expect(pickFunName('Pixel Panda|Turbo Toast', 'Pixel Panda', () => 0)).toBe('Turbo Toast');
  });

  it('Given the catalogue has not loaded (t returned the raw key), Then it never hands the key out as a name', () => {
    expect(pickFunName('eduStudent.join.funNames', '')).toBe('');
    expect(pickFunName('eduStudent.join.funNames', 'Maya')).toBe('Maya');
  });
});
