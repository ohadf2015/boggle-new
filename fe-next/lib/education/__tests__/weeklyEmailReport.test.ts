/**
 * The weekly email report is plain text a teacher pastes straight into an
 * email to parents/admins. Every line comes from i18n keys (the caller
 * passes `t`); the formatter only composes labelled lines + localized date.
 */
import { describe, it, expect } from 'vitest';
import { buildWeeklyEmailReport } from '../weeklyEmailReport';

const DICT: Record<string, string> = {
  'teacher.digest.emailReportSubject': 'This week in {{classroom}}',
  'teacher.digest.emailReportGreeting': 'Hi,',
  'teacher.digest.emailReportIntro': "Here is this week's LexiClash report for {{classroom}} (week of {{weekStart}}):",
  'teacher.digest.emailReportStudentsJoined': 'Students joined this week: {{count}}',
  'teacher.digest.emailReportGamesPlayed': 'Games played: {{count}}',
  'teacher.digest.emailReportScore': 'Average score: {{score}}% ({{delta}} vs last week)',
  'teacher.digest.emailReportScoreFlat': 'Average score: {{score}}%',
  'teacher.digest.emailReportScoreUnknown': 'Average score: —',
  'teacher.digest.emailReportWordsMastered': 'Words mastered this week: {{count}}',
  'teacher.digest.emailReportSignoff': 'Sent from LexiClash',
};

function t(key: string, vars?: Record<string, string | number>): string {
  const template = DICT[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

const INPUT = {
  classroomName: 'Year 7',
  weekStartIso: '2026-10-06T12:00:00.000Z',
  studentsJoinedThisWeek: 2,
  gamesPlayed: 6,
  averageScorePct: 81,
  scoreWowDeltaPct: 5,
  wordsMasteredThisWeek: 14,
};

describe('buildWeeklyEmailReport', () => {
  it('builds a plain-text subject and body with the four weekly metrics', () => {
    const { subject, body } = buildWeeklyEmailReport(t, INPUT, 'en');
    expect(subject).toBe('This week in Year 7');
    const lines = body.split('\n');
    expect(lines).toContain('Hi,');
    expect(lines).toContain(
      "Here is this week's LexiClash report for Year 7 (week of Oct 6, 2026):",
    );
    expect(lines).toContain('Students joined this week: 2');
    expect(lines).toContain('Games played: 6');
    expect(lines).toContain('Average score: 81% (+5 vs last week)');
    expect(lines).toContain('Words mastered this week: 14');
    expect(lines).toContain('Sent from LexiClash');
  });

  it('emits no HTML — paste-safe for email clients', () => {
    const { subject, body } = buildWeeklyEmailReport(t, INPUT, 'en');
    expect(subject + body).not.toMatch(/<[^>]+>/);
  });

  it('signs negative deltas and skips the trend text when the delta is null', () => {
    const down = buildWeeklyEmailReport(t, { ...INPUT, scoreWowDeltaPct: -3 }, 'en');
    expect(down.body).toContain('Average score: 81% (-3 vs last week)');
    const flat = buildWeeklyEmailReport(t, { ...INPUT, scoreWowDeltaPct: null }, 'en');
    expect(flat.body).toContain('Average score: 81%');
    expect(flat.body).not.toContain('vs last week');
  });

  it('falls back to the unknown-score line when nobody had a rated session', () => {
    const { body } = buildWeeklyEmailReport(t, { ...INPUT, averageScorePct: null, scoreWowDeltaPct: null }, 'en');
    expect(body).toContain('Average score: —');
  });

  it('localizes the week-start date with the given locale', () => {
    const hebrew = buildWeeklyEmailReport(t, INPUT, 'he');
    expect(hebrew.body).toContain('Year 7');
    expect(hebrew.body).toMatch(/2026/);
    const swedish = buildWeeklyEmailReport(t, INPUT, 'sv');
    expect(swedish.body).toMatch(/2026/);
  });
});
