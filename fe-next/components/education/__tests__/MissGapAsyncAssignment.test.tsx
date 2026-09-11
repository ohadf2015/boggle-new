/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissGapAsyncAssignment } from '../MissGapAsyncAssignment';
import { shareWithFallback } from '@/utils/shareWithFallback';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));

vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn().mockReturnValue(true),
}));

// The homework game has its own suite (components/education/missGap/__tests__).
// Here it is stubbed down to the two things this component cares about: the
// callback that fires when the server accepted a finished run, and the fact
// that the turn-in actions are rendered INSIDE the finish screen — the real
// component passes `finishActions` straight through to MissGapCompletion.
vi.mock('@/components/education/missGap/MissGapGame', () => ({
  MissGapGame: ({
    onFinished,
    finishActions,
  }: {
    onFinished?: (streak: number) => void;
    finishActions?: React.ReactNode;
  }) => (
    <div>
      <button type="button" data-testid="stub-finish-game" onClick={() => onFinished?.(4)}>
        finish
      </button>
      {finishActions}
    </div>
  ),
}));

vi.mock('@/components/education/missGap/MissGapTeacherProgress', () => ({
  MissGapTeacherProgress: () => <div data-testid="stub-teacher-progress" />,
}));

const payload: MissGapAssignmentPayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '',
};

/** The progress endpoint, answering with a class that is 5 days into a streak. */
function mockProgressFetch(streakDays = 5) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      players: 3,
      averageAccuracy: 82,
      runs: [],
      streak: { currentStreak: streakDays, longestStreak: 9 },
    }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('MissGapAsyncAssignment', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(shareWithFallback).mockClear();
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
    mockProgressFetch();
  });

  it('teacher mode: due date + Kahootopia foil + GC assign (not Unplugged Live)', () => {
    render(<MissGapAsyncAssignment payload={payload} teacherMode />);
    expect(screen.getByTestId('miss-gap-async-assignment')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-async-foil')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-async-due-date')).toBeInTheDocument();
    const gc = screen.getByTestId('assign-miss-gap-async-google-classroom');
    expect(gc.getAttribute('href')).toContain('classroom.google.com/share');
    expect(gc.getAttribute('href')).toContain('itemtype=assignment');
    expect(decodeURIComponent(gc.getAttribute('href') || '')).toContain(
      'miss-gap-assignment',
    );
    expect(decodeURIComponent(gc.getAttribute('href') || '')).not.toContain(
      'unplugged-reteach',
    );
    expect(screen.getByTestId('miss-gap-practice-card')).toBeInTheDocument();
  });

  it('student mode: due banner + complete feeds class streak + grade passback', async () => {
    // Both server reads agree: the POST that finished the run reports a 4-day
    // streak, and the refetch it triggers confirms it.
    const fetchMock = mockProgressFetch(4);
    render(
      <MissGapAsyncAssignment
        payload={{ ...payload, dueDate: '2099-12-31' }}
        teacherMode={false}
      />,
    );
    expect(screen.getByTestId('miss-gap-async-due-banner')).toBeInTheDocument();
    // The CTA now opens the game — homework is played, not self-marked.
    fireEvent.click(screen.getByTestId('miss-gap-async-complete'));
    fireEvent.click(await screen.findByTestId('stub-finish-game'));
    await waitFor(() => {
      // The server number wins over the device copy once it lands.
      expect(screen.getByTestId('miss-gap-class-streak').textContent).toContain(
        '"streak":4',
      );
    });
    // Finishing re-reads the roster so the teacher's card is not stale.
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    const grade = await screen.findByTestId('miss-gap-async-grade-passback');
    expect(grade).toBeInTheDocument();
    const link = screen.getByTestId('miss-gap-async-open-grade-passback');
    expect(link.getAttribute('href')).toContain('miss-gap-grade-passback');
    expect(link.getAttribute('href')).toContain('points=100');
    const wa = screen.getByTestId('miss-gap-async-whatsapp-share');
    expect(wa.getAttribute('href')).toContain('wa.me');
    const decoded = decodeURIComponent(wa.getAttribute('href') || '');
    expect(decoded).toContain('miss-gap-whatsapp');
    expect(decoded).toContain('utm_source=whatsapp');
    expect(decoded).toContain('due=2099-12-31');
  });

  /**
   * The class streak is the whole point of moving homework off localStorage: a
   * student opening the link on a fresh phone must see the streak their CLASS
   * built, not the 0 their own device knows about.
   */
  it('student mode: shows the class streak the server reports, not the device 0', async () => {
    const fetchMock = mockProgressFetch(5);
    render(
      <MissGapAsyncAssignment
        payload={{ ...payload, dueDate: '2099-12-31' }}
        teacherMode={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-class-streak').textContent).toContain(
        '"streak":5',
      );
    });
    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain('/api/education/miss-gap/progress');
    expect(requested).toContain('dueDate=2099-12-31');
  });

  it('shares async homework URL with due date', async () => {
    render(
      <MissGapAsyncAssignment
        payload={{ ...payload, dueDate: '2026-09-11' }}
        teacherMode
      />,
    );
    fireEvent.click(screen.getByTestId('share-miss-gap-async-homework'));
    await waitFor(() => expect(shareWithFallback).toHaveBeenCalled());
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0] as { url?: string };
    expect(arg.url).toContain('/education/miss-gap-assignment');
    expect(arg.url).toContain('due=2026-09-11');
    expect(arg.url).toContain('neutron');
  });
});
