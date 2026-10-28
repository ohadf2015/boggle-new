import { describe, expect, it } from 'vitest';
import { teacherDay2Value } from '../teacherDay2Value';
import { day2ReportUrl, day2UpgradeUrl } from '@/lib/education/day2ValueEmail';

describe('teacherDay2Value', () => {
  it('states how many students joined and games were played, and links the report and Teacher Pro', () => {
    const { subject, html, replyTo } = teacherDay2Value({
      fullName: 'Ada',
      locale: 'en',
      studentsJoined: 4,
      gamesPlayed: 7,
    });
    expect(subject).toContain('4');
    expect(subject).toContain('7');
    expect(html).toContain('4 students joined, 7 games played');
    expect(html).toContain(day2ReportUrl('en'));
    expect(html).toContain(day2UpgradeUrl('en'));
    expect(html).toContain('$9');
    expect(html).toContain('Ada');
    expect(replyTo).toBe('ohadf2015@gmail.com');
  });

  it('renders Hebrew RTL and does not fall back to the English lead', () => {
    const { html, subject } = teacherDay2Value({
      fullName: 'מורה',
      locale: 'he',
      studentsJoined: 2,
      gamesPlayed: 1,
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(day2ReportUrl('he'));
    expect(html).toContain(day2UpgradeUrl('he'));
    expect(subject).not.toContain('students joined');
    expect(html).not.toContain('students joined');
  });

  it('escapes the teacher name and has copy for every teacher locale', () => {
    const nasty = teacherDay2Value({ fullName: '<Ada>', locale: 'en', studentsJoined: 0, gamesPlayed: 0 });
    expect(nasty.html).toContain('&lt;Ada&gt;');
    expect(nasty.html).not.toContain('<Ada>');
    expect(nasty.html).toContain('0 students joined, 0 games played');
    for (const locale of ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const) {
      const out = teacherDay2Value({ fullName: 'T', locale, studentsJoined: 3, gamesPlayed: 5 });
      expect(out.subject.length).toBeGreaterThan(0);
      expect(out.html).toContain(day2ReportUrl(locale));
      expect(out.html).toContain(day2UpgradeUrl(locale));
      expect(out.html).toMatch(/\$9|9\$/);
    }
  });
});
