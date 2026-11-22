import { describe, it, expect } from 'vitest';
import { REPORT_TABS, reportId, resolveReportTab } from '../reportParams';

const ID = '3f2b8c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f';

describe('reportId', () => {
  it('Given a uuid, Then it is kept', () => {
    expect(reportId(ID)).toBe(ID);
  });

  it.each([null, undefined, '', 'null', 'undefined', 'classroom-1', `${ID}x`])('Given %j, Then it is treated as absent', (v) => {
    expect(reportId(v)).toBeNull();
  });
});

describe('resolveReportTab', () => {
  it('Given every tab id, Then it maps to itself', () => {
    for (const id of REPORT_TABS) expect(resolveReportTab(id)).toBe(id);
  });

  it('Given an old link to the pulse or lessons tab, Then it opens where that content now lives', () => {
    expect(resolveReportTab('pulse')).toBe('words');
    expect(resolveReportTab('lessons')).toBe('more');
  });

  it('Given an unknown or missing tab, Then there is none', () => {
    expect(resolveReportTab('nope')).toBeNull();
    expect(resolveReportTab(null)).toBeNull();
  });

  it('Then the class report tabs are students, games, words, homework, more', () => {
    expect(REPORT_TABS).toEqual(['students', 'games', 'words', 'homework', 'more']);
  });
});
