import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { DailyMissionsHeader } from '../DailyMissionsHeader';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';

vi.mock('@/utils/dailyChallenge/dateUtils', () => ({
  getSecondsUntilNextDaily: vi.fn(() => 3661),
}));

vi.mock('@/shared/utils', () => ({
  formatTimeHHMMSS: vi.fn((s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LanguageProvider initialLanguage="en">{ui}</LanguageProvider>
  );
}

describe('DailyMissionsHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders progress bar with 0 completed', () => {
    renderWithProviders(<DailyMissionsHeader completedCount={0} />);

    const progressBar = screen.getByTestId('xp-progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  test('renders progress bar with 1 completed (50%)', () => {
    renderWithProviders(<DailyMissionsHeader completedCount={1} />);

    const progressBar = screen.getByTestId('xp-progress-bar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  test('renders progress bar with 2 completed (100%)', () => {
    renderWithProviders(<DailyMissionsHeader completedCount={2} />);

    const progressBar = screen.getByTestId('xp-progress-bar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  test('renders countdown timer', () => {
    renderWithProviders(<DailyMissionsHeader completedCount={0} />);

    const timer = screen.getByTestId('countdown-timer');
    expect(timer).toBeInTheDocument();
    expect(timer.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('renders date card with current date', () => {
    renderWithProviders(<DailyMissionsHeader completedCount={0} />);

    const dateCard = screen.getByTestId('date-card');
    expect(dateCard).toBeInTheDocument();
  });

  test('renders completion count text', () => {
    renderWithProviders(<DailyMissionsHeader completedCount={1} />);

    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
  });

  test('updates countdown every second', () => {

    getSecondsUntilNextDaily.mockReturnValue(3661);

    renderWithProviders(<DailyMissionsHeader completedCount={0} />);

    const callsBefore = getSecondsUntilNextDaily.mock.calls.length;

    // Advance time by 1 second
    getSecondsUntilNextDaily.mockReturnValue(3660);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Timer should have been called at least once more after the interval tick
    expect(getSecondsUntilNextDaily.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
