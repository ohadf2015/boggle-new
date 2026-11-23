import { describe, it, expect } from 'vitest';
import { REPORT_TABS, reportId, resolveReportTab, ownedClassroomId } from '../reportParams';

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

describe('ownedClassroomId', () => {
  const mine = [{ id: 'a' }, { id: 'b' }];
  it('Given a class the teacher owns, When classes have loaded, Then it is kept', () => {
    expect(ownedClassroomId('a', mine, false)).toBe('a');
  });
  it('Given a class id that is not theirs, When classes have loaded, Then there is no class', () => {
    expect(ownedClassroomId('zzz', mine, false)).toBeNull();
  });
  it('Given classes still loading, When asked, Then the id is kept until the list can disprove it', () => {
    expect(ownedClassroomId('zzz', undefined, true)).toBe('zzz');
  });
  it('Given no id, Then there is none', () => {
    expect(ownedClassroomId(null, mine, false)).toBeNull();
  });
});
