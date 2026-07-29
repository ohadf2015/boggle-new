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

vi.mock('@/utils/platform', () => ({
  isNative: () => false,
}));

// Need to mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { useMissedDailies } from '@/hooks/useMissedDailies';

describe('CatchUpSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default return value
    (useMissedDailies as ReturnType<typeof vi.fn>).mockReturnValue({
      missed: [
        { date: '2025-01-19', puzzleNumber: 21 },
        { date: '2025-01-18', puzzleNumber: 20 },
      ],
      loading: false,
    });
  });

  it('renders word-hunt links by default', () => {
    render(<CatchUpSuggestion />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/en/daily/word-hunt?date=2025-01-19');
    expect(links[1]).toHaveAttribute('href', '/en/daily/word-hunt?date=2025-01-18');
  });

  it('renders word-wheel links when mode is word-wheel', () => {
    render(<CatchUpSuggestion mode="word-wheel" />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/en/daily/word-wheel?date=2025-01-19');
    expect(links[1]).toHaveAttribute('href', '/en/daily/word-wheel?date=2025-01-18');
  });

  it('passes mode to useMissedDailies hook', () => {
    render(<CatchUpSuggestion mode="word-wheel" />);
    expect(useMissedDailies).toHaveBeenCalledWith('word-wheel');
  });

  it('passes word-hunt mode to useMissedDailies by default', () => {
    render(<CatchUpSuggestion />);
    expect(useMissedDailies).toHaveBeenCalledWith('word-hunt');
  });

  it('excludes the specified date', () => {
    render(<CatchUpSuggestion excludeDate="2025-01-19" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/en/daily/word-hunt?date=2025-01-18');
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
