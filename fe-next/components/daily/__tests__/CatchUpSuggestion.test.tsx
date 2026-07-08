import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatchUpSuggestion from '../CatchUpSuggestion';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/hooks/useMissedDailies', () => ({
  useMissedDailies: vi.fn(() => ({
    missed: [
      { date: '2025-01-19', puzzleNumber: 21 },
      { date: '2025-01-18', puzzleNumber: 20 },
    ],
    loading: false,
  })),
}));

// Platform is toggled per-test: web (false) pitches the app, native (true)
// renders the playable replay links.
vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(() => false),
}));

// Keep the Play Store URL deterministic so we can assert the CTA target.
vi.mock('@/utils/androidApp', () => ({
  playStoreUrlWithReferrer: vi.fn((campaign: string) => `https://play.example/?c=${campaign}`),
}));

// Need to mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { useMissedDailies } from '@/hooks/useMissedDailies';
import { isNative } from '@/utils/platform';
import { playStoreUrlWithReferrer } from '@/utils/androidApp';

describe('CatchUpSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default return values
    (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({
      missed: [
        { date: '2025-01-19', puzzleNumber: 21 },
        { date: '2025-01-18', puzzleNumber: 20 },
      ],
      loading: false,
    });
    (isNative as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (playStoreUrlWithReferrer as ReturnType<typeof vi.fn>).mockImplementation(
      (campaign: string) => `https://play.example/?c=${campaign}`,
    );
  });

  describe('on web', () => {
    it('does NOT render playable replay links for missed dailies', () => {
      render(<CatchUpSuggestion />);
      const links = screen.queryAllByRole('link');
      // No link should point at a replayable daily puzzle.
      expect(links.every(l => !l.getAttribute('href')?.includes('/daily/'))).toBe(true);
    });

    it('pitches the Android app with a Play Store CTA', () => {
      render(<CatchUpSuggestion />);
      const cta = screen.getByRole('link');
      expect(cta).toHaveAttribute('href', 'https://play.example/?c=daily_catchup');
    });

    it('shows the app-pitch subtitle with the missed count', () => {
      render(<CatchUpSuggestion />);
      expect(screen.getByText('daily.catchUp.appSubtitle')).toBeInTheDocument();
    });

    it('renders nothing when no missed dailies', () => {
      (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({ missed: [], loading: false });
      const { container } = render(<CatchUpSuggestion />);
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when all missed dailies are excluded', () => {
      (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({
        missed: [{ date: '2025-01-19', puzzleNumber: 21 }],
        loading: false,
      });
      const { container } = render(<CatchUpSuggestion excludeDate="2025-01-19" />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('on native', () => {
    beforeEach(() => {
      (isNative as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('renders word-hunt replay links by default', () => {
      render(<CatchUpSuggestion />);
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/en/daily/word-hunt?date=2025-01-19');
      expect(links[1]).toHaveAttribute('href', '/en/daily/word-hunt?date=2025-01-18');
    });

    it('renders word-wheel replay links when mode is word-wheel', () => {
      render(<CatchUpSuggestion mode="word-wheel" />);
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/en/daily/word-wheel?date=2025-01-19');
      expect(links[1]).toHaveAttribute('href', '/en/daily/word-wheel?date=2025-01-18');
    });

    it('shows the watch-ad hint', () => {
      render(<CatchUpSuggestion />);
      expect(screen.getByText('daily.catchUp.watchAd')).toBeInTheDocument();
    });

    it('still shows missed replay links on today\'s results (excludeDate = today)', () => {
      const iso = (offsetDays: number) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - offsetDays);
        return d.toISOString().split('T')[0];
      };
      const today = iso(0);
      (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({
        missed: [
          { date: iso(1), puzzleNumber: 101 },
          { date: iso(2), puzzleNumber: 100 },
        ],
        loading: false,
      });
      render(<CatchUpSuggestion excludeDate={today} />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', `/en/daily/word-hunt?date=${iso(1)}`);
      expect(links[1]).toHaveAttribute('href', `/en/daily/word-hunt?date=${iso(2)}`);
    });

    // Regression: the #189<->#190 tap ping-pong that locked the Daily Hub UI.
    // On a catch-up's OWN results screen (excludeDate is a past date), the nudge
    // must NOT re-surface — otherwise two unsolved past dailies mutually offer
    // each other and every tap just swaps the in-place results between them,
    // trapping the player. The nudge belongs only on today's results.
    it('suppresses the nudge entirely on a catch-up (past-date) results screen', () => {
      const { container } = render(<CatchUpSuggestion excludeDate="2025-01-19" />);
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when no missed dailies', () => {
      (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({ missed: [], loading: false });
      const { container } = render(<CatchUpSuggestion />);
      expect(container.innerHTML).toBe('');
    });
  });

  it('passes mode to useMissedDailies hook', () => {
    render(<CatchUpSuggestion mode="word-wheel" />);
    expect(useMissedDailies).toHaveBeenCalledWith('word-wheel');
  });

  it('passes word-hunt mode to useMissedDailies by default', () => {
    render(<CatchUpSuggestion />);
    expect(useMissedDailies).toHaveBeenCalledWith('word-hunt');
  });
});
