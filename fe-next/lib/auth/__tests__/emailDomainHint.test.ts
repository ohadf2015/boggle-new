import { describe, expect, it } from 'vitest';
import {
  applyDomain,
  editDistance,
  emailDomain,
  emailHintBlocksSubmit,
  looksLikeSchoolDomain,
  suggestConfirmedDomain,
  suggestLabelTypo,
} from '../emailDomainHint';

describe('email domain hint', () => {
  it('suggests a confirmed domain 1-2 edits away (studnets → students)', () => {
    const known = ['gmail.com', 'students.mpac.nsw.edu.au', 'schools.nyc.gov'];
    expect(suggestConfirmedDomain('studnets.mpac.nsw.edu.au', known)).toBe('students.mpac.nsw.edu.au');
    expect(suggestConfirmedDomain('student.mpac.nsw.edu.au', known)).toBe('students.mpac.nsw.edu.au');
    expect(suggestConfirmedDomain('students.mpac.nsw.edu.au', known)).toBeNull();
    expect(suggestConfirmedDomain('gmail.com', known)).toBeNull();
  });

  it('does not suggest a domain more than 2 edits away', () => {
    expect(editDistance('studnets', 'students')).toBeLessThanOrEqual(2);
    expect(suggestConfirmedDomain('zzzz.example.com', ['students.mpac.nsw.edu.au'])).toBeNull();
  });

  it('rewrites a school-label typo only as a no-MX fallback', () => {
    expect(suggestLabelTypo('studnets.mpac.nsw.edu.au')).toBe('students.mpac.nsw.edu.au');
    expect(suggestLabelTypo('gmail.com')).toBeNull();
  });

  it('recognises school domains that should offer a teacher toggle', () => {
    expect(looksLikeSchoolDomain('schools.nyc.gov')).toBe(true);
    expect(looksLikeSchoolDomain('students.mpac.nsw.edu.au')).toBe(true);
    expect(looksLikeSchoolDomain('davinci-leiden.nl')).toBe(false);
    expect(looksLikeSchoolDomain('gmail.com')).toBe(false);
    expect(emailDomain('a@students.mpac.nsw.edu.au')).toBe('students.mpac.nsw.edu.au');
    expect(applyDomain('a@studnets.mpac.nsw.edu.au', 'students.mpac.nsw.edu.au'))
      .toBe('a@students.mpac.nsw.edu.au');
  });

  it('holds the first submit when there is a suggestion or no MX, then releases', () => {
    expect(emailHintBlocksSubmit({ suggestion: 'a@students.x', mx: false, school: true }, false)).toBe(true);
    expect(emailHintBlocksSubmit({ suggestion: 'a@students.x', mx: false, school: true }, true)).toBe(false);
    expect(emailHintBlocksSubmit({ suggestion: null, mx: true, school: false }, false)).toBe(false);
    expect(emailHintBlocksSubmit(null, false)).toBe(false);
  });
});
