/**
 * Pro "Missed-words homework" card (Teacher HQ → Class tools).
 * One tap = every student gets their own missed words from the last game.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: unknown, p?: Record<string, unknown>) => {
      const params = (typeof fb === 'object' ? fb : p) as Record<string, unknown> | undefined;
      return params ? `${k}:${Object.values(params).join(',')}` : k;
    },
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 't1' } }) }));

let games: unknown[] = [];
let loading = false;
vi.mock('@/hooks/useRecentClassroomGames', () => ({
  useRecentClassroomGames: () => ({ games, isLoading: loading, error: null, refresh: vi.fn() }),
}));
const createAssignment = vi.fn();
const getClassroomAssignments = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  createAssignment: (...a: unknown[]) => createAssignment(...a),
  getClassroomAssignments: (...a: unknown[]) => getClassroomAssignments(...a),
}));
const trackAssigned = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProMissedHomeworkAssigned: (...a: unknown[]) => trackAssigned(...a),
}));

import { MissedWordsHomeworkCard } from '../MissedWordsHomeworkCard';

const L1 = '11111111-1111-4111-8111-111111111111';
const GAME = {
  lessonIds: [L1],
  players: [
    { studentId: 's1', name: 'Dana', lessonWordsMissed: ['apple', 'pear'] },
    { studentId: 's2', name: 'Noa', lessonWordsMissed: ['plum'] },
    { studentId: 's3', name: 'Omer', lessonWordsMissed: [] },
  ],
};

describe('<MissedWordsHomeworkCard>', () => {
  beforeEach(() => {
    games = [GAME];
    loading = false;
    createAssignment.mockReset().mockResolvedValue({ data: { id: 'a1' }, error: null });
    getClassroomAssignments.mockReset().mockResolvedValue({ data: [], error: null });
    trackAssigned.mockReset();
  });

  it('Given last-game misses, When shown, Then it says how many students get their own words', async () => {
    render(<MissedWordsHomeworkCard classroomId="c1" />);
    expect(await screen.findByTestId('missed-homework-summary')).toHaveTextContent(
      'academy.homework.summary:2,3'
    );
    // Each student's own words are previewed, most misses first.
    const rows = screen.getAllByTestId('missed-homework-student');
    expect(rows[0]).toHaveTextContent('Dana');
    expect(rows[0]).toHaveTextContent('2');
  });

  it('Given one tap, When assigned, Then it writes the classroom assignment and confirms', async () => {
    render(<MissedWordsHomeworkCard classroomId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /academy\.homework\.assign/ }));
    await waitFor(() => expect(screen.getByTestId('missed-homework-done')).toBeInTheDocument());
    expect(createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ classroom_id: 'c1', lesson_id: L1, teacher_id: 't1', practice_focus: null })
    );
    expect(trackAssigned).toHaveBeenCalledWith({
      classroomId: 'c1',
      studentCount: 2,
      wordCount: 3,
      lessonCount: 1,
    });
  });

  it('Given the write fails, When assigned, Then it says so out loud and offers a retry', async () => {
    createAssignment.mockResolvedValue({ data: null, error: { message: 'rls' } });
    render(<MissedWordsHomeworkCard classroomId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /academy\.homework\.assign/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('academy.homework.failed');
    expect(screen.getByRole('button', { name: /academy\.homework\.assign/ })).toBeEnabled();
    expect(trackAssigned).not.toHaveBeenCalled();
  });

  it('Given the lesson is already assigned, When shown, Then there is no button to assign twice', async () => {
    getClassroomAssignments.mockResolvedValue({ data: [{ lesson_id: L1 }], error: null });
    render(<MissedWordsHomeworkCard classroomId="c1" />);
    expect(await screen.findByTestId('missed-homework-done')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /academy\.homework\.assign/ })).not.toBeInTheDocument();
  });

  it('Given no game yet, When shown, Then it explains what unlocks it', async () => {
    games = [];
    render(<MissedWordsHomeworkCard classroomId="c1" />);
    expect(await screen.findByTestId('missed-homework-empty')).toHaveTextContent('academy.homework.noGame');
  });

  it('Given nobody missed a word, When shown, Then it celebrates instead of offering an empty assignment', async () => {
    games = [{ ...GAME, players: [{ studentId: 's3', name: 'Omer', lessonWordsMissed: [] }] }];
    render(<MissedWordsHomeworkCard classroomId="c1" />);
    expect(await screen.findByTestId('missed-homework-empty')).toHaveTextContent('academy.homework.noMisses');
  });
});
