/**
 * The History tab crashed EVERY time into the generic error boundary, which is
 * what blocked the blind critic from ever reaching the async duel turn card.
 *
 * Cause: the rows come back with `challenger:profiles(...)` / `opponent:profiles(...)`
 * embeds, and a student reading ANOTHER student's `profiles` row gets nothing
 * back — own-row RLS returns zero rows with `error: null`, so the embed is
 * `null`, not a row with a blank name. `opponent.display_name` on a null then
 * threw a TypeError during render.
 *
 * A missing name is normal here. It must render a fallback, never take the tab
 * down (recurring-pitfalls Class 4: the silent source that returns nothing).
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DuelHistory } from '../DuelHistory';

const mockGetDuelStats = vi.fn();
const mockGetDuelHistory = vi.fn();

vi.mock('@/lib/supabase/education/duels', () => ({
  getDuelStats: (...a: unknown[]) => mockGetDuelStats(...a),
  getDuelHistory: (...a: unknown[]) => mockGetDuelHistory(...a),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const mockReadStudentName = vi.fn();
vi.mock('@/lib/education/duelOpponentNames', () => ({
  readStudentName: (...a: unknown[]) => mockReadStudentName(...a),
}));

const stats = { wins: 1, losses: 1, draws: 0, winStreak: 1, totalDuels: 2 };

function duelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'duel-1',
    challenger_id: 'student-1',
    opponent_id: 'opponent-1',
    challenger_score: 40,
    opponent_score: 25,
    winner_id: 'student-1',
    isWin: true,
    challenger: { id: 'student-1', display_name: 'Me', avatar_config: null },
    opponent: null,
    ...overrides,
  };
}

describe('DuelHistory — an opponent the database will not name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDuelStats.mockResolvedValue({ data: stats, error: null });
    mockReadStudentName.mockReturnValue(null);
  });

  it('renders the duel instead of crashing when the profile embed is null', async () => {
    mockGetDuelHistory.mockResolvedValue({ data: [duelRow()], error: null });

    render(<DuelHistory studentId="student-1" />);

    const entry = await screen.findByTestId('duel-entry-win');
    expect(entry).toHaveTextContent('common.opponent');
    expect(entry).toHaveTextContent('40');
    expect(entry).toHaveTextContent('25');
  });

  it('survives a row with no profile on either side', async () => {
    mockGetDuelHistory.mockResolvedValue({
      data: [duelRow({ challenger: null, opponent: null, challenger_id: 'opponent-1', opponent_id: 'student-1', winner_id: null, isWin: false })],
      error: null,
    });

    render(<DuelHistory studentId="student-1" />);
    await waitFor(() => expect(screen.getByTestId('duel-entry-draw')).toBeInTheDocument());
  });

  it('uses the name the lobby banked against that student id', async () => {
    mockReadStudentName.mockReturnValue('Maya');
    mockGetDuelHistory.mockResolvedValue({ data: [duelRow()], error: null });

    render(<DuelHistory studentId="student-1" />);

    const entry = await screen.findByTestId('duel-entry-win');
    expect(entry).toHaveTextContent('Maya');
    expect(mockReadStudentName).toHaveBeenCalledWith('opponent-1');
  });

  it('prefers the real display name when the embed did resolve', async () => {
    mockGetDuelHistory.mockResolvedValue({
      data: [duelRow({ opponent: { id: 'opponent-1', display_name: 'Noa', avatar_config: null } })],
      error: null,
    });

    render(<DuelHistory studentId="student-1" />);
    expect(await screen.findByTestId('duel-entry-win')).toHaveTextContent('Noa');
  });
});
