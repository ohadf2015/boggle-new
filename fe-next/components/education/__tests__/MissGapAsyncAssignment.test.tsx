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

  it('teacher mode: due date + GC assign (not Unplugged Live), no positioning copy', () => {
    render(<MissGapAsyncAssignment payload={payload} teacherMode />);
    expect(screen.getByTestId('miss-gap-async-assignment')).toBeInTheDocument();
    // The competitor-positioning line was written for the PR, not for a teacher
    // standing in front of a class. One element fewer on the screen.
    expect(screen.queryByTestId('miss-gap-async-foil')).not.toBeInTheDocument();
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
    // The take-home card is reachable, not open — see the disclosure test below.
    expect(screen.getByTestId('miss-gap-takehome-toggle')).toBeInTheDocument();
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
        '"count":4',
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
        '"count":5',
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

  /**
   * Decision fatigue, measured. The finished student screen used to carry TWO
   * full-width lime buttons — "play it again" and the grade turn-in — plus a
   * saturated WhatsApp button, so nothing read as THE next thing to do. The
   * turn-in is the one that ends the homework, so it is the only primary left.
   */
  it('student mode: exactly one primary CTA once the run is recorded', async () => {
    const { container } = render(
      <MissGapAsyncAssignment
        payload={{ ...payload, dueDate: '2099-12-31' }}
        teacherMode={false}
      />,
    );
    fireEvent.click(screen.getByTestId('miss-gap-async-complete'));
    fireEvent.click(await screen.findByTestId('stub-finish-game'));
    await screen.findByTestId('miss-gap-async-grade-passback');

    const primaries = container.querySelectorAll('.bg-neo-lime');
    expect(primaries).toHaveLength(1);
    expect(screen.getByTestId('miss-gap-async-open-grade-passback').className).toContain(
      'bg-neo-lime',
    );
    // Replay survives as a quieter control — visible, bordered, not a primary.
    const replay = screen.getByTestId('miss-gap-async-complete');
    expect(replay.className).not.toContain('bg-neo-lime');
    expect(replay.className).toContain('border-[3px]');
  });

  /**
   * The printable take-home card is the parent-facing artifact and the WhatsApp
   * share points at it — so it stays. It just stops being a second full card
   * shouting under the finish screen: one disclosure, closed by default.
   */
  it('student mode: the take-home card waits behind one disclosure', async () => {
    render(
      <MissGapAsyncAssignment
        payload={{ ...payload, dueDate: '2099-12-31' }}
        teacherMode={false}
      />,
    );
    fireEvent.click(screen.getByTestId('miss-gap-async-complete'));
    fireEvent.click(await screen.findByTestId('stub-finish-game'));
    await screen.findByTestId('miss-gap-async-grade-passback');

    expect(screen.queryByTestId('miss-gap-practice-card')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('miss-gap-takehome-toggle'));
    expect(await screen.findByTestId('miss-gap-practice-card')).toBeInTheDocument();
  });

  /**
   * REVERSED 2026-09-12. This used to assert the teacher's card rendered open,
   * on the reasoning that it is the teacher's working surface. Measured at
   * 1440x900 that open card put the document at 1294px against a 900 viewport
   * and left its own "Start unplugged reteach Live" below the fold — a clipped
   * live CTA, which cost the piece the round. It is also a second CTA cluster
   * under the screen's one primary action. The teacher's working surface is
   * sending the link; the printable card is one tap away.
   * See MissGapAsyncAssignment.fold.test.tsx for the full reasoning.
   */
  it('teacher mode: the take-home card waits behind the same one disclosure', () => {
    render(<MissGapAsyncAssignment payload={payload} teacherMode />);
    expect(screen.queryByTestId('miss-gap-practice-card')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('miss-gap-takehome-toggle'));
    expect(screen.getByTestId('miss-gap-practice-card')).toBeInTheDocument();
  });

  /**
   * Reload safety. Anything that re-mounts the page — the cookie banner's
   * accept, a pull-to-refresh, reopening the link from WhatsApp — used to wipe
   * the receipt: back to "Start", no turn-in, no score, as if the homework had
   * never been done. The run was in the database the whole time.
   */
  it('student mode: a reload still shows the receipt for a finished run', async () => {
    const props = {
      payload: { ...payload, dueDate: '2099-12-31' },
      teacherMode: false,
    };
    const first = render(<MissGapAsyncAssignment {...props} />);
    fireEvent.click(screen.getByTestId('miss-gap-async-complete'));
    fireEvent.click(await screen.findByTestId('stub-finish-game'));
    await screen.findByTestId('miss-gap-async-grade-passback');
    first.unmount();

    render(<MissGapAsyncAssignment {...props} />);
    expect(
      await screen.findByTestId('miss-gap-async-open-grade-passback'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-takehome-toggle')).toBeInTheDocument();
  });
});
