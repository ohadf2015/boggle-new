import { afterEach, describe, expect, it } from 'vitest';
import { isBlastFxDisabled } from '../blastFxSwitch';

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('isBlastFxDisabled', () => {
  it('is on by default', () => {
    expect(isBlastFxDisabled()).toBe(false);
  });

  it('turns off with ?fx=off', () => {
    window.history.replaceState(null, '', '/en/blast?fx=off');
    expect(isBlastFxDisabled()).toBe(true);
  });

  it('turns off with the stored switch', () => {
    window.localStorage.setItem('blast:fx', 'off');
    expect(isBlastFxDisabled()).toBe(true);
  });

  it('ignores other values', () => {
    window.history.replaceState(null, '', '/en/blast?fx=on');
    window.localStorage.setItem('blast:fx', 'on');
    expect(isBlastFxDisabled()).toBe(false);
  });

  it('survives storage that throws', () => {
    const real = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    try {
      expect(isBlastFxDisabled()).toBe(false);
    } finally {
      Storage.prototype.getItem = real;
    }
  });
});
