import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompletionTracker from './CompletionTracker';
import { getAssignmentCompletions } from '@/lib/supabase/education/assignments';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { fetchWithAuth } from '@/utils/authFetch';

vi.mock('@/lib/supabase/education/assignments');
vi.mock('@/lib/supabase/education/classrooms');
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const pro = { hasPro: true, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    language: 'en',
  }),
}));

const completions = getAssignmentCompletions as Mock;
const students = getClassroomStudents as Mock;

const progress = (student_id: string, words: Record<string, [number, number]>, name?: string) => ({
  id: `p-${student_id}`,
  student_id,
  assignment_id: 'a1',
  completed_at: '2026-11-02T10:00:00Z',
  words_attempted: Object.fromEntries(Object.entries(words).map(([w, [correct, attempts]]) => [w, { correct, attempts }])),
  words_mastered: [],
  profiles: name ? { display_name: name } : null,
});

const member = (student_id: string, display_name: string) => ({ student_id, profiles: { display_name } });

function renderTracker() {
  return render(<CompletionTracker assignmentId="a1" classroomId="c1" classroomName="5B" totalStudents={4} />);
}

describe('CompletionTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pro.hasPro = true;
    students.mockResolvedValue({
      data: [member('s1', 'Noa'), member('s2', 'Ari'), member('s3', 'Dana'), member('s4', 'Yoni')],
      error: null,
    });
  });

  it('shows how many played and names who has not played yet', async () => {
    completions.mockResolvedValue({ data: [progress('s1', { cat: [2, 2] }), progress('s2', { cat: [1, 1] })], error: null });
    renderTracker();
    expect(await screen.findByTestId('results-played-count')).toHaveTextContent('teacher.completion.playedCount:{"played":2,"total":4}');
    const waiting = screen.getByTestId('results-not-played');
    expect(within(waiting).getByText('Dana')).toBeInTheDocument();
    expect(within(waiting).getByText('Yoni')).toBeInTheDocument();
    expect(within(waiting).queryByText('Noa')).not.toBeInTheDocument();
  });

  it('lists the students who need help with their score', async () => {
    completions.mockResolvedValue({
      data: [progress('s1', { cat: [0, 2] }), progress('s2', { cat: [2, 2] })],
      error: null,
    });
    renderTracker();
    const help = await screen.findByTestId('results-need-help');
    expect(within(help).getByText('Noa')).toBeInTheDocument();
    expect(within(help).getByText('0%')).toBeInTheDocument();
    expect(within(help).queryByText('Ari')).not.toBeInTheDocument();
  });

  it('ranks the words the class missed, with how many missed each', async () => {
    completions.mockResolvedValue({
      data: [progress('s1', { apple: [0, 1], pear: [0, 1] }), progress('s2', { apple: [0, 2] }), progress('s3', { apple: [1, 1] })],
      error: null,
    });
    renderTracker();
    const words = await screen.findByTestId('results-missed-words');
    const rows = within(words).getAllByTestId('missed-word');
    expect(rows[0]).toHaveTextContent('apple');
    expect(rows[0]).toHaveTextContent('teacher.completion.missedBy:{"count":2,"played":3}');
    expect(rows[1]).toHaveTextContent('pear');
  });

  it('shows each player\'s own missed words next to their name', async () => {
    completions.mockResolvedValue({ data: [progress('s1', { apple: [0, 1], dog: [1, 1] })], error: null });
    renderTracker();
    const row = await screen.findByTestId('played-s1');
    expect(within(row).getByText('apple')).toBeInTheDocument();
    expect(within(row).queryByText('dog')).not.toBeInTheDocument();
  });

  it('re-practises the missed words in one tap', async () => {
    completions.mockResolvedValue({ data: [progress('s1', { apple: [0, 1] })], error: null });
    (fetchWithAuth as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, words: ['apple'], rounds: [{ dueDate: '2026-11-04' }, { dueDate: '2026-11-06' }, { dueDate: '2026-11-10' }] }),
    });
    renderTracker();
    fireEvent.click(await screen.findByRole('button', { name: /eduPro.practice.cta/ }));
    await screen.findByTestId('missed-practice-assigned');
    const [url, init] = (fetchWithAuth as Mock).mock.calls[0];
    expect(url).toBe('/api/education/classroom/c1/missed-practice');
    expect(JSON.parse(init.body).words).toEqual(['apple']);
  });

  it('offers the re-practice as an upgrade on the free plan', async () => {
    pro.hasPro = false;
    completions.mockResolvedValue({ data: [progress('s1', { apple: [0, 1] })], error: null });
    renderTracker();
    expect(await screen.findByRole('link', { name: /eduPro.practice.cta/ })).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('reads a finished row with no word data as played, with no misses and no bare %', async () => {
    completions.mockResolvedValue({ data: [{ ...progress('s1', {}), words_attempted: null, words_mastered: null }], error: null });
    renderTracker();
    const row = await screen.findByTestId('played-s1');
    expect(within(row).getByText('teacher.completion.noMisses')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.completion.onTrack')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('results-need-help')).getByText('teacher.completion.noScores')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eduPro.practice.cta/ })).not.toBeInTheDocument();
  });

  it('says nobody has played yet instead of an empty report', async () => {
    completions.mockResolvedValue({ data: [], error: null });
    renderTracker();
    expect(await screen.findByText('teacher.completion.nobodyYet')).toBeInTheDocument();
    expect(screen.queryByTestId('results-need-help')).not.toBeInTheDocument();
  });

  it('shows an error with a retry when results fail to load, never a fake zero', async () => {
    completions.mockResolvedValueOnce({ data: [], error: { message: 'boom' } });
    renderTracker();
    expect(await screen.findByRole('alert')).toHaveTextContent('teacher.completion.loadFailed');
    expect(screen.queryByTestId('results-played-count')).not.toBeInTheDocument();
    completions.mockResolvedValueOnce({ data: [progress('s1', { cat: [1, 1] })], error: null });
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    await waitFor(() => expect(screen.getByTestId('played-s1')).toBeInTheDocument());
  });

  it('still shows results when only the roster fails, with the players named from their profile', async () => {
    students.mockResolvedValue({ data: [], error: { message: 'no roster' } });
    completions.mockResolvedValue({ data: [progress('s9', { cat: [1, 1] }, 'Maya')], error: null });
    renderTracker();
    const row = await screen.findByTestId('played-s9');
    expect(row).toHaveTextContent('Maya');
  });
});
