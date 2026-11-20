import { describe, it, expect } from 'vitest';
import { isBareCallbackVisit, callbackSessionLoss } from '../noSessionReport';

describe('isBareCallbackVisit', () => {
  it('is true when the callback URL has no query string and no hash', () => {
    expect(isBareCallbackVisit({ search: '', hash: '' })).toBe(true);
    expect(isBareCallbackVisit({ search: '?', hash: '#' })).toBe(true);
  });

  it.each([
    { search: '?code=abc', hash: '' },
    { search: '', hash: '#access_token=x&refresh_token=y' },
    { search: '', hash: '#error=access_denied&error_code=otp_expired' },
    { search: '?next=%2Fen%2Fteacher', hash: '' },
  ])('is false when the URL carried anything %o', (input) => {
    expect(isBareCallbackVisit(input)).toBe(false);
  });
});

describe('callbackSessionLoss', () => {
  it('stays quiet on a stray visit with no OAuth result', () => {
    expect(callbackSessionLoss({ search: '', hash: '' })).toBeNull();
    expect(callbackSessionLoss({ search: '?', hash: '#' })).toBeNull();
  });

  it('reports a code that came back without a session, with the latched provider', () => {
    expect(callbackSessionLoss({
      search: '?code=abc&next=%2Fen%2Feducation%2Faccess',
      hash: '',
      provider: 'google',
    })).toEqual({ reason: 'code_no_session', provider: 'google' });
  });

  it('uses the provider error code, not a generic failure', () => {
    expect(callbackSessionLoss({
      search: '?error=access_denied&next=%2Fen%2Feducation%2Faccess',
      hash: '',
      provider: 'google',
    })).toEqual({ reason: 'access_denied', provider: 'google' });
  });

  it('reports hash tokens that never became a session', () => {
    expect(callbackSessionLoss({
      search: '',
      hash: '#access_token=x&refresh_token=y',
      provider: 'discord',
    })).toEqual({ reason: 'hash_no_session', provider: 'discord' });
  });

  it('lets the caller name a loss the URL alone cannot (other tab, exception)', () => {
    expect(callbackSessionLoss({
      search: '?code=abc',
      hash: '',
      provider: 'google',
      override: 'other_tab_timeout',
    })).toEqual({ reason: 'other_tab_timeout', provider: 'google' });
  });

  it('does not invent a provider', () => {
    expect(callbackSessionLoss({ search: '?code=abc', hash: '' })).toEqual({
      reason: 'code_no_session',
      provider: 'unknown',
    });
  });
});
