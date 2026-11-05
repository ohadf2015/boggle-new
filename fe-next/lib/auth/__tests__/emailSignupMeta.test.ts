import { describe, expect, it } from 'vitest';
import {
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
    expect(normalizeLanguage('HE')).toBe('he');
    expect(normalizeCountry('t1')).toBeNull();
  });
});
