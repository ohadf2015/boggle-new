import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AlertTriangle } from 'lucide-react';
import type { MockedFunction } from 'vitest';
import { MetricCard } from '../MetricCard';
import { StudentProgressTable } from '../StudentProgressTable';
import { ReportEmptyState } from '@/components/teacher/reports/ReportEmptyState';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import type { StudentProgressSummary } from '@/lib/supabase/analytics';

vi.mock('@/hooks/useStudentProgressMetrics');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key), language: 'en' }),
}));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div /> }));
vi.mock('@/components/AvatarLite', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../ShareParentReportButton', () => ({
  ShareParentReportButton: ({ studentId }: { studentId: string }) => <button type="button" data-testid={`share-parent-report-${studentId}`}>share</button>,
}));

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);
const LOUD_FILL = /^bg-neo-(lime|yellow|cyan|pink|orange|cream)$/;
const loudIn = (root: Element) => [root, ...root.querySelectorAll('[class]')].filter((el) => tokens(el).some((c) => LOUD_FILL.test(c)));

const student = (i: number, over: Partial<StudentProgressSummary> = {}): StudentProgressSummary =>
  ({
    studentId: `s${i}`,
    displayName: `Student ${i}`,
    avatarConfig: null,
    currentLevel: 1,
    totalXp: 100 - i,
    vocabularyMastery: 0,
    overallAccuracy: 0,
    currentStreak: 0,
    lastPracticeDate: null,
    isStruggling: false,
    ...over,
  }) as unknown as StudentProgressSummary;

describe('Pro class report: calm surfaces', () => {
  it('given a calm metric, then it is a navy tile with no colored fills and an outlined action', () => {
    const onClick = vi.fn();
    render(<MetricCard tone="calm" title="Needing help" value={3} icon={<AlertTriangle />} severity="urgent" compact actionable={{ label: 'See students', onClick }} />);
    const card = screen.getByTestId('metric-card');
    expect(loudIn(card)).toEqual([]);
    expect(tokens(card)).toContain('bg-neo-navy-light');
    fireEvent.click(screen.getByRole('button', { name: 'See students' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('given a full class, then the student table shows one page at a time with a pager', () => {
    (useStudentProgressMetrics as MockedFunction<typeof useStudentProgressMetrics>).mockReturnValue({
      students: Array.from({ length: 40 }, (_, i) => student(i)),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useStudentProgressMetrics>);
    render(<StudentProgressTable classroomId="c1" pageSizeFallback={8} />);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 8);
    expect(screen.getByTestId('student-table-pager')).toHaveTextContent('1');
    fireEvent.click(screen.getByTestId('student-table-next'));
    expect(screen.getByText('Student 8')).toBeInTheDocument();
    expect(screen.queryByText('Student 0')).toBeNull();
  });

  it('given a struggling student, then the row is marked by a neutral chip, not an orange fill', () => {
    (useStudentProgressMetrics as MockedFunction<typeof useStudentProgressMetrics>).mockReturnValue({
      students: [student(1, { isStruggling: true })],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useStudentProgressMetrics>);
    const { container } = render(<StudentProgressTable classroomId="c1" />);
    expect(container.innerHTML).not.toMatch(/neo-orange|\buppercase\b/);
    expect(screen.getByText('education.analytics.struggling')).toBeInTheDocument();
  });

  it('given no game yet, then the report offers one lime action and an outlined second one in normal case', () => {
    const { container } = render(<ReportEmptyState classroomId="c1" />);
    const links = screen.getAllByRole('link');
    expect(links.filter((a) => tokens(a).includes('bg-neo-lime'))).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/\buppercase\b|neo-cyan/);
  });
});
