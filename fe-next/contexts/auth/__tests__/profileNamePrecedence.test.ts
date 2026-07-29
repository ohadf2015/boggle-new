import { describe, it, expect } from 'vitest';
import { decideDisplayName } from '../profileNamePrecedence';

describe('decideDisplayName', () => {
  it('uses FTUE name and marks customized when user edited it', () => {
    const result = decideDisplayName({
      ftueName: 'CoolPlayer',
      ftueNameEdited: true,
      oauthName: null,
      randomFallback: 'Sneaky Pickle',
    });
    expect(result).toEqual({
      displayName: 'CoolPlayer',
      source: 'ftue',
      hasCustomized: true,
    });
  });

  it('uses OAuth name and marks customized when no edited FTUE name', () => {
    const result = decideDisplayName({
      ftueName: null,
      ftueNameEdited: false,
      oauthName: 'John',
      randomFallback: 'Sneaky Pickle',
    });
    expect(result).toEqual({
      displayName: 'John',
      source: 'oauth',
      hasCustomized: true,
    });
  });

  it('prefers OAuth name over UNEDITED FTUE suggestion (force-change goal)', () => {
    const result = decideDisplayName({
      ftueName: 'Disco Potato',
      ftueNameEdited: false,
      oauthName: 'Maria',
      randomFallback: 'Cosmic Banana',
    });
    expect(result).toEqual({
      displayName: 'Maria',
      source: 'oauth',
      hasCustomized: true,
    });
  });

  it('uses unedited FTUE name but marks NOT customized so modal forces change', () => {
    const result = decideDisplayName({
      ftueName: 'Sneaky Pickle',
      ftueNameEdited: false,
      oauthName: null,
      randomFallback: 'Loopy Llama',
    });
    expect(result).toEqual({
      displayName: 'Sneaky Pickle',
      source: 'ftue',
      hasCustomized: false,
    });
  });

  it('uses random fallback and marks NOT customized when nothing else available', () => {
    const result = decideDisplayName({
      ftueName: null,
      ftueNameEdited: false,
      oauthName: null,
      randomFallback: 'Bouncy Bear',
    });
    expect(result).toEqual({
      displayName: 'Bouncy Bear',
      source: 'random',
      hasCustomized: false,
    });
  });

  it('treats empty/whitespace ftueName as missing', () => {
    const result = decideDisplayName({
      ftueName: '   ',
      ftueNameEdited: true,
      oauthName: 'Yuki',
      randomFallback: 'Loopy Llama',
    });
    expect(result.source).toBe('oauth');
    expect(result.displayName).toBe('Yuki');
  });

  it('treats empty oauthName as missing', () => {
    const result = decideDisplayName({
      ftueName: null,
      ftueNameEdited: false,
      oauthName: '',
      randomFallback: 'Loopy Llama',
    });
    expect(result.source).toBe('random');
    expect(result.hasCustomized).toBe(false);
  });

  it('treats undefined ftueNameEdited as not edited (legacy data safety)', () => {
    const result = decideDisplayName({
      ftueName: 'Disco Potato',
      ftueNameEdited: undefined,
      oauthName: null,
      randomFallback: 'X',
    });
    expect(result.hasCustomized).toBe(false);
  });
});
