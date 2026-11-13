import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatchUpSuggestion from '../CatchUpSuggestion';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/hooks/useMissedDailies', () => ({
  useMissedDailies: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { useMissedDailies } from '@/hooks/useMissedDailies';

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

describe('CatchUpSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({
      missed: [
        { date: iso(1), puzzleNumber: 101 },
        { date: iso(2), puzzleNumber: 100 },
      ],
      loading: false,
    });
  });

  it('Given missed days, When rendered (any platform), Then each is a playable link', () => {
    render(<CatchUpSuggestion />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', `/en/daily/word-hunt?date=${iso(1)}`);
    expect(links[1]).toHaveAttribute('href', `/en/daily/word-hunt?date=${iso(2)}`);
  });

  it('links to the Word Wheel replay when mode is word-wheel', () => {
    render(<CatchUpSuggestion mode="word-wheel" />);
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', `/en/daily/word-wheel?date=${iso(1)}`);
  });

  it('never mentions an ad', () => {
    const { container } = render(<CatchUpSuggestion />);
    expect(container.textContent).not.toMatch(/watchAd|adBadge|📺/);
    expect(screen.queryByTestId('catch-up-ad-badge')).toBeNull();
  });

  it('still shows the missed days on today\'s results (excludeDate = today)', () => {
    render(<CatchUpSuggestion excludeDate={iso(0)} />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  // The #189<->#190 tap ping-pong: on a past day's own results the nudge must stay away.
  it('renders nothing on a catch-up (past-date) results screen', () => {
    const { container } = render(<CatchUpSuggestion excludeDate={iso(1)} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no missed dailies', () => {
    (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({ missed: [], loading: false });
    const { container } = render(<CatchUpSuggestion />);
    expect(container.innerHTML).toBe('');
  });

  it('passes mode to useMissedDailies', () => {
    render(<CatchUpSuggestion mode="word-wheel" />);
    expect(useMissedDailies).toHaveBeenCalledWith('word-wheel');
  });
});
