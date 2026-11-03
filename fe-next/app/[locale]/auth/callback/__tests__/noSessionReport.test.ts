import { describe, it, expect } from 'vitest';
import { isBareCallbackVisit } from '../noSessionReport';

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
