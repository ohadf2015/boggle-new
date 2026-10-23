import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const { mockLanguage } = vi.hoisted(() => ({ mockLanguage: { value: 'en' } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: mockLanguage.value }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));
const { mockGetClassroomStudents } = vi.hoisted(() => ({ mockGetClassroomStudents: vi.fn() }));
vi.mock('@/lib/supabase/education', () => ({
  getClassroomStudents: (...a: unknown[]) => mockGetClassroomStudents(...a),
  setStudentLevel: vi.fn(),
}));

import ClassroomStudentList from '../ClassroomStudentList';

const LONG = 'Maximiliana Alexandrovna Konstantinopolskaya';

describe('ClassroomStudentList: roster row fits a narrow class card', () => {
  beforeEach(() => {
    mockGetClassroomStudents.mockResolvedValue({
      data: [{ id: 'm1', student_id: 's1', classroom_id: 'c1', joined_at: new Date().toISOString(), level: 'core', profiles: { display_name: LONG } }],
      error: null,
    });
  });

  it('puts the level control on its own full-width row at every width, since the card is narrow even on desktop', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    const group = await screen.findByRole('group', { name: 'teacher.levels.label' });
    const slot = group.parentElement as HTMLElement;
    expect(slot.className).toContain('basis-full');
    expect(slot.className).not.toMatch(/sm:basis-auto|sm:ms-auto/);
    expect(group.className).not.toMatch(/sm:w-auto/);
  });

  it('shows the joined time under the name, so a long name truncates without pushing the remove button off the card', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    const identity = await screen.findByTestId('roster-identity');
    expect(within(identity).getByText(LONG)).toHaveAttribute('title', LONG);
    expect(within(identity).getByTestId('roster-joined')).toBeInTheDocument();
  });

  it('keeps the level explainer folded behind a toggle instead of a wall of text above the roster', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    const legend = await screen.findByText('teacher.levels.legend');
    const details = legend.closest('details') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(within(details.querySelector('summary') as HTMLElement).getByText('teacher.levels.label')).toBeInTheDocument();
  });
});

describe('ClassroomStudentList: joined time speaks the teacher language', () => {
  it('formats the joined time with the active locale instead of English', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    mockGetClassroomStudents.mockResolvedValue({
      data: [{ id: 'm1', student_id: 's1', classroom_id: 'c1', joined_at: twoDaysAgo, level: 'core', profiles: { display_name: 'Dana' } }],
      error: null,
    });
    mockLanguage.value = 'he';
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    const joined = await screen.findByTestId('roster-joined');
    expect(joined.textContent).toBe(new Intl.RelativeTimeFormat('he', { numeric: 'auto' }).format(-2, 'day'));
    expect(joined.textContent).not.toMatch(/ago/);
    mockLanguage.value = 'en';
  });
});
