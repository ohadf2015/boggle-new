import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatchUpDays from '../CatchUpDays';

let mockAuth = { isAuthenticated: false, loading: false };
const mockMissed: Record<string, { missed: { date: string; puzzleNumber: number }[]; status: string }> = {};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('@/hooks/useMissedDailies', () => ({
  useMissedDailies: (mode: string, enabled: boolean) =>
    enabled ? { loading: false, ...mockMissed[mode] } : { missed: [], loading: false, status: 'idle' },
}));

const iso = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().split('T')[0];
};

describe('CatchUpDays', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuth = { isAuthenticated: false, loading: false };
    mockMissed['word-hunt'] = { missed: [], status: 'ok' };
    mockMissed['word-wheel'] = { missed: [], status: 'ok' };
  });

  it('Given a guest with nothing played, Then each of the last 3 days offers both modes to play', () => {
    render(<CatchUpDays />);
    const links = screen.getAllByRole('link');
    expect(links.map(l => l.getAttribute('href'))).toEqual([
      `/en/daily/word-hunt?date=${iso(1)}`, `/en/daily/word-wheel?date=${iso(1)}`,
      `/en/daily/word-hunt?date=${iso(2)}`, `/en/daily/word-wheel?date=${iso(2)}`,
      `/en/daily/word-hunt?date=${iso(3)}`, `/en/daily/word-wheel?date=${iso(3)}`,
    ]);
    expect(screen.getAllByText('daily.archivePage.play')).toHaveLength(6);
  });

  it('Given a guest who played yesterday\'s Word Wheel on this device, Then that slot reads done', () => {
    localStorage.setItem(`lexiclash_word_wheel_en_${iso(1)}`, '{}');
    render(<CatchUpDays />);
    expect(screen.getByTestId(`catch-up-word-wheel-${iso(1)}`)).toHaveAttribute('data-played', 'true');
    expect(screen.getByTestId(`catch-up-word-hunt-${iso(1)}`)).toHaveAttribute('data-played', 'false');
  });

  it('Given auth is still resolving, Then it shows a skeleton, never a guess', () => {
    mockAuth = { isAuthenticated: false, loading: true };
    render(<CatchUpDays />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByTestId('catch-up-days-skeleton')).toBeInTheDocument();
  });

  it('Given a signed-in player, Then days the server does not list as missed read done', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockMissed['word-hunt'] = { missed: [{ date: iso(1), puzzleNumber: 1 }], status: 'ok' };
    render(<CatchUpDays />);
    expect(screen.getByTestId(`catch-up-word-hunt-${iso(1)}`)).toHaveAttribute('data-played', 'false');
    expect(screen.getByTestId(`catch-up-word-hunt-${iso(2)}`)).toHaveAttribute('data-played', 'true');
  });

  it('Given the server fails for a signed-in player, Then nothing is marked done from the empty list', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockMissed['word-hunt'] = { missed: [], status: 'error' };
    render(<CatchUpDays />);
    expect(screen.getByTestId(`catch-up-word-hunt-${iso(2)}`)).toHaveAttribute('data-played', 'false');
  });
});
