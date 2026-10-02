import { describe, it, expect } from 'vitest';
import { parentLinksToCsv, parentLinksToText, absoluteReportUrl, PARENT_LINK_DAYS } from '../parentLinks';
import { PARENT_REPORT_TOKEN_DAYS } from '@/lib/education/parentReportToken';

const links = [
  { studentId: 's1', name: 'Maya', path: '/report/abc' },
  { studentId: 's2', name: 'Leo, "the kid"', path: '/report/def' },
];

describe('absoluteReportUrl', () => {
  it('prefixes origin and locale, like the single-student share button', () => {
    expect(absoluteReportUrl('https://www.lexiclash.live', 'sv', '/report/abc')).toBe(
      'https://www.lexiclash.live/sv/report/abc',
    );
  });
});

describe('parentLinksToCsv', () => {
  it('writes a header plus one row per student with absolute links', () => {
    const csv = parentLinksToCsv(links, { origin: 'https://x.test', locale: 'en', studentHeader: 'Student', linkHeader: 'Report link' });
    const rows = csv.trim().split('\n');
    expect(rows[0]).toBe('Student,Report link');
    expect(rows[1]).toBe('Maya,https://x.test/en/report/abc');
    expect(rows[2]).toBe('"Leo, ""the kid""",https://x.test/en/report/def');
  });

  it('neutralises spreadsheet formulas in names', () => {
    const csv = parentLinksToCsv([{ studentId: 's', name: '=HYPERLINK("x")', path: '/report/z' }], {
      origin: 'https://x.test', locale: 'en', studentHeader: 'S', linkHeader: 'L',
    });
    expect(csv.split('\n')[1].startsWith('"\'=HYPERLINK')).toBe(true);
  });
});

describe('parentLinksToText', () => {
  it('gives one "name: link" line per student for pasting into email or chat', () => {
    expect(parentLinksToText(links, { origin: 'https://x.test', locale: 'he' })).toBe(
      'Maya: https://x.test/he/report/abc\nLeo, "the kid": https://x.test/he/report/def',
    );
  });
});

describe('PARENT_LINK_DAYS', () => {
  it('tells teachers the real token lifetime', () => {
    expect(PARENT_LINK_DAYS).toBe(PARENT_REPORT_TOKEN_DAYS);
  });
});
