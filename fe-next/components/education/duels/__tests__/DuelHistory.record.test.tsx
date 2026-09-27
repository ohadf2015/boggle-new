/**
 * The history tab opened with five stat squares in five different colours
 * (green-600, red-600, yellow-500, pink, cyan) carrying white 12px labels.
 * White on yellow-500 is 1.9:1 and white on green-600 is 3.2:1 — both fail the
 * gauntlet's text rule — and five accents at once is the opposite of the one
 * accent + neutrals the design addendum asks for. It was also ~180px of height
 * on a screen that now has a fixed budget.
 *
 * One record strip replaces all five: a single cream card, black text, W / L /
 * win-rate, with the streak as the one chip that earns its own colour (orange =
 * streak/fire, used nowhere else on this surface).
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

const stats = { wins: 5, losses: 3, draws: 1, winStreak: 2, totalDuels: 9 };

describe('DuelHistory — one record strip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDuelHistory.mockResolvedValue({ data: [], error: null });
  });

  it('reads the whole record off one card', async () => {
    mockGetDuelStats.mockResolvedValue({ data: stats, error: null });

    render(<DuelHistory studentId="student-1" />);

    const strip = await screen.findByTestId('duel-record-strip');
    expect(strip).toHaveTextContent('5');
    expect(strip).toHaveTextContent('3');
    expect(strip).toHaveTextContent('55.6%');
    // A light card on the navy surface, black text — no white-on-yellow.
    expect(strip.className).toContain('bg-neo-cream');
  });

  it('shows the streak chip only when there is a streak', async () => {
    mockGetDuelStats.mockResolvedValue({ data: { ...stats, winStreak: 0 }, error: null });
    const { unmount } = render(<DuelHistory studentId="student-1" />);
    await screen.findByTestId('duel-record-strip');
    expect(screen.queryByTestId('duel-streak-chip')).not.toBeInTheDocument();
    unmount();

    mockGetDuelStats.mockResolvedValue({ data: { ...stats, winStreak: 4 }, error: null });
    render(<DuelHistory studentId="student-1" />);
    await waitFor(() =>
      expect(screen.getByTestId('duel-streak-chip')).toHaveTextContent('4')
    );
  });

  it('drops the five-colour stat grid entirely', async () => {
    mockGetDuelStats.mockResolvedValue({ data: stats, error: null });
    const { container } = render(<DuelHistory studentId="student-1" />);
    await screen.findByTestId('duel-record-strip');

    expect(container.querySelectorAll('.bg-yellow-500')).toHaveLength(0);
    expect(container.querySelectorAll('.bg-green-600')).toHaveLength(0);
    expect(container.querySelectorAll('.bg-red-600')).toHaveLength(0);
  });
});
