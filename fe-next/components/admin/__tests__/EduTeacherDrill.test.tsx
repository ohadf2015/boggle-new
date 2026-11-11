import { render, screen, fireEvent, within } from '@testing-library/react';
import { teacher } from './eduDashboardFixture';
import { EduTeacherTable } from '../edu-dashboard/EduTeacherTable';
import { EduTodayStrip } from '../edu-dashboard/EduTodayStrip';

vi.mock('@/hooks/useCountUp', () => ({ useCountUp: ({ target }: { target: number }) => target }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>, p?: Record<string, string | number>) =>
      typeof fb === 'string' ? fb.replace(/\{(\w+)\}/g, (_, n: string) => String(p?.[n] ?? `{${n}}`)) : k,
    language: 'en',
  }),
}));

const rows = [
  teacher('t1', 'Dana Levi', 'thriving', { students: 30, classes: 2, roundsLast7d: 5 }),
  teacher('t2', 'Ron Katz', 'at_risk', { students: 4 }),
] as never;
const classes = [
  { id: 'c1', name: 'Grade 5A', teacherId: 't1', teacherName: 'Dana Levi', students: 18, lastRoundAt: '2026-11-09T08:00:00Z', roundsInWindow: 4 },
  { id: 'c2', name: 'Grade 6B', teacherId: 't1', teacherName: 'Dana Levi', students: 12, lastRoundAt: null, roundsInWindow: 0 },
  { id: 'c3', name: 'Other', teacherId: 't2', teacherName: 'Ron Katz', students: 4, lastRoundAt: null, roundsInWindow: 0 },
] as never;

describe('EduTeacherTable per-customer drill-down', () => {
  it('opens a teacher in place and lists only their classes with a link to the full view', () => {
    render(<EduTeacherTable rows={rows} classes={classes} drill={null} onClearDrill={() => {}} />);
    expect(screen.queryByText('Grade 5A')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open Dana Levi/ }));
    const detail = screen.getByTestId('teacher-detail-t1');
    expect(within(detail).getByText('Grade 5A')).toBeInTheDocument();
    expect(within(detail).getByText('Grade 6B')).toBeInTheDocument();
    expect(within(detail).queryByText('Other')).not.toBeInTheDocument();
    expect(within(detail).getByRole('link', { name: 'Full teacher view' })).toHaveAttribute('href', '/en/admin/education/teacher/t1');
    expect(within(detail).getByRole('link', { name: 'Grade 5A' })).toHaveAttribute('href', '/en/admin/education/class/c1');
  });

  it('closes it again', () => {
    render(<EduTeacherTable rows={rows} classes={classes} drill={null} onClearDrill={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Open Dana Levi/ }));
    fireEvent.click(screen.getByRole('button', { name: /Close Dana Levi/ }));
    expect(screen.queryByTestId('teacher-detail-t1')).not.toBeInTheDocument();
  });

  it('finds a teacher by name or email', () => {
    render(<EduTeacherTable rows={rows} classes={classes} drill={null} onClearDrill={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 't2@school' } });
    const names = within(screen.getByTestId('teacher-table')).queryAllByRole('link').map((a) => a.textContent);
    expect(names).toEqual(['Ron Katz']);
  });
});

describe('EduTodayStrip', () => {
  const tile = (current: number, prior: number, projected: number | null, pct: number | null) => ({ current, prior, projected, pct });
  it('shows today against yesterday for games, teachers and seats', () => {
    render(
      <EduTodayStrip today={{ available: true, rounds: { ...tile(6, 4, 12, 200), spark: [1, 2, 3, 4, 5, 4, 6] }, teachers: tile(3, 3, 6, 100), seats: tile(80, 50, 160, 220) }} />,
    );
    expect(within(screen.getByTestId('edu-today-rounds')).getByText('6')).toBeInTheDocument();
    expect(screen.getByTestId('edu-today-rounds-delta').textContent).toBe('At this pace: 12 · \u2066+200%\u2069 vs yesterday (4)');
    expect(within(screen.getByTestId('edu-today-seats')).getByText('80')).toBeInTheDocument();
  });

  it('renders nothing when class games are not tracked here yet', () => {
    const { container } = render(<EduTodayStrip today={{ available: false }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
