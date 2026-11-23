import { describe, expect, it } from 'vitest';
import {
  normalizeGrDistinctId,
  buildEmailSignupMetadata,
  normalizeCountry,
  normalizeLanguage,
  normalizeSurface,
} from '../emailSignupMeta';

describe('buildEmailSignupMetadata', () => {
  it('always stamps a signup surface so an email row is not unattributed', () => {
    expect(buildEmailSignupMetadata({})).toEqual({ signup_surface: 'header_or_menu' });
  });

  it('keeps a latched surface and drops null first-touch fields', () => {
    expect(buildEmailSignupMetadata({
      signupSurface: 'edu_access',
      firstTouch: { utm_source: 'google', utm_medium: null, landing_path: '/en/education' },
      language: 'en-US',
      countryCode: 'nl',
      intendedRole: 'teacher',
    })).toEqual({
      signup_surface: 'edu_access',
      utm_source: 'google',
      landing_path: '/en/education',
      language: 'en',
      country_code: 'NL',
      intended_role: 'teacher',
    });
  });

  it('refuses admin and unknown surfaces, languages, and countries', () => {
    expect(buildEmailSignupMetadata({
      signupSurface: 'Teacher Page!',
      language: 'fr',
      countryCode: 'XX',
      intendedRole: 'admin' as 'teacher',
    })).toEqual({ signup_surface: 'header_or_menu' });
    expect(normalizeSurface('results_inline')).toBe('results_inline');
    expect(normalizeSurface('soft-sheet')).toBe('soft-sheet');
    expect(normalizeSurface('multi_games_sheet')).toBe('soft-sheet');
    expect(normalizeLanguage('HE')).toBe('he');
    expect(normalizeCountry('t1')).toBeNull();
  });

  it('keeps only an anonymous gr.js visitor id, never a user id or junk', () => {
    expect(normalizeGrDistinctId('mi7x2k3a-8f3k2l9q0zp1')).toBe('mi7x2k3a-8f3k2l9q0zp1');
    expect(normalizeGrDistinctId('44a8bb33-1c2d-4e5f-8a9b-0c1d2e3f4a5b')).toBeNull();
    expect(normalizeGrDistinctId('<script>-alert1')).toBeNull();
    expect(normalizeGrDistinctId(null)).toBeNull();
  });
});
