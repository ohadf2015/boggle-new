import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportView } from '../ReportView';
import { buildStudentInsights } from '@/lib/education/studentInsights';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { interpolate } from '@/components/education/lobby/eduText';
import type { ParentReportSummary } from '@/lib/education/parentReportData';

const NOW = new Date('2026-10-21T12:00:00Z');
const tFor = (locale: string) => (key: string, params?: Record<string, string | number>) =>
  interpolate(translateKey(key, locale), params);

const data: ParentReportSummary = {
  displayName: 'נועה',
  totalXp: 1540,
  lessonsCompleted: 2,
  wordsMastered: 1,
  recentActivity: [{ completedAt: '2026-10-21T09:00:00Z' }],
  classroomName: 'ג׳ 2',
  teacherName: 'רחל',
  generatedAt: NOW.toISOString(),
  insights: buildStudentInsights({
    progressRows: [
      {
        total_xp: 1540,
        words_mastered: ['tree'],
        words_attempted: { sun: { correct: 1, attempts: 5 }, tree: { correct: 3, attempts: 3 } },
        completed_at: '2026-10-01T00:00:00Z',
        current_streak: 1,
        longest_streak: 2,
      },
    ],
    sessionRows: [],
    now: NOW,
  }),
};

describe('ReportView', () => {
  it('does not render a second <main> inside the layout landmark', () => {
    const { container } = render(<ReportView locale="he" token="tok" data={data} t={tFor('he')} />);
    expect(container.querySelector('main')).toBeNull();
    expect(container.querySelector('[data-parent-report]')?.getAttribute('dir')).toBe('rtl');
  });

  it('ships a print sheet that sizes the page to A4 and hides the site chrome around the report', () => {
    const { container } = render(<ReportView locale="en" token="tok" data={data} t={tFor('en')} />);
    const css = [...container.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4/);
    expect(css).toMatch(/@media print/);
    expect(css).toContain(':not(:has([data-parent-report]))');
    expect(css).toMatch(/\[data-parent-report\] \* \{ box-shadow: none !important; \}/);
  });

  it('lets a Hebrew "% right" label keep its natural direction (no forced LTR run around words)', () => {
    render(<ReportView locale="he" token="tok" data={data} t={tFor('he')} />);
    const label = screen.getByText(translateKey('parentReport.wordAccuracy', 'he').replace('{value}', '20'));
    expect(label.closest('[dir="ltr"]')).toBeNull();
  });
});

describe('ReportView recent activity', () => {
  it('drops the all-time line when there is nothing to total, so an empty report is not a row of zeros', () => {
    const fresh = { ...data, totalXp: 0, lessonsCompleted: 0, recentActivity: [], insights: buildStudentInsights({ progressRows: [], sessionRows: [], now: NOW }) };
    const { container } = render(<ReportView locale="en" token="tok" data={fresh} t={tFor('en')} />);
    expect(container.textContent).not.toContain('All time');
    expect(container.textContent).toContain(translateKey('parentReport.noRecentActivity', 'en'));
  });
});

describe('parentReport RTL copy', () => {
  it('never puts a Latin word right before a number placeholder in Hebrew (bidi would glue them into one LTR run)', async () => {
    const { he } = (await import('@/translations/he.js')) as { he: Record<string, unknown> };
    const flat = JSON.stringify(he.parentReport);
    expect(flat).toContain('allTime');
    expect(flat).not.toMatch(/[A-Za-z]+[\s·,:–-]*\{\w+\}/);
  });
  it.each(['he', 'en', 'ru'])('Given no student name, When the %s report renders, Then the heading uses the localized fallback', (locale) => {
    render(<ReportView locale={locale} token="tok" data={{ ...data, displayName: null }} t={tFor(locale)} />);
    const fallback = translateKey('parentReport.studentFallback', locale);
    expect(fallback).not.toBe('parentReport.studentFallback');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(fallback);
    expect(document.body).not.toHaveTextContent(/\bStudent\b/);
  });
});
