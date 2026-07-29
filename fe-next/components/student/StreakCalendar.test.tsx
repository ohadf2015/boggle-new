/**
 * StreakCalendar Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StreakCalendar from './StreakCalendar';

// Mock dependencies
const mockT = vi.fn((key) => key);

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
  }),
}));

describe('StreakCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current date for consistent testing
    vi.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-14T12:00:00Z')); // Wednesday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 7 day indicators', () => {
    render(<StreakCalendar currentStreak={0} lastWinDate={null} />);

    // Should render 7 day circles (one for each day)
    const dayIndicators = screen.getAllByTestId(/^day-/);
    expect(dayIndicators).toHaveLength(7);
  });

  it('shows current streak count', () => {
    render(<StreakCalendar currentStreak={5} lastWinDate="2024-02-14T12:00:00Z" />);

    // Should show streak count with flame emoji or text
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('marks correct days as active based on streak count and lastWinDate', () => {
    // Today is Feb 14 (Wed), streak is 3, last win is today
    // Should mark: Feb 14 (Wed), Feb 13 (Tue), Feb 12 (Mon) as active
    const { container } = render(
      <StreakCalendar currentStreak={3} lastWinDate="2024-02-14T12:00:00Z" />
    );

    // Count active days (those with flame icon or active styling)
    const activeDays = container.querySelectorAll('[data-active="true"]');
    expect(activeDays).toHaveLength(3);
  });

  it('marks no days as active when streak is 0', () => {
    const { container } = render(
      <StreakCalendar currentStreak={0} lastWinDate={null} />
    );

    const activeDays = container.querySelectorAll('[data-active="true"]');
    expect(activeDays).toHaveLength(0);
  });

  it('highlights today with special styling', () => {
    render(<StreakCalendar currentStreak={1} lastWinDate="2024-02-14T12:00:00Z" />);

    // Today should have ring highlight
    const todayIndicator = screen.getByTestId('day-6'); // 7th day (today) is index 6
    expect(todayIndicator).toHaveClass('ring-2', 'ring-neo-cyan');
  });

  it('handles streak ending yesterday correctly', () => {
    // Streak is 2, last win was yesterday (Feb 13)
    // Should mark: Feb 13 (Tue), Feb 12 (Mon) as active
    const { container } = render(
      <StreakCalendar currentStreak={2} lastWinDate="2024-02-13T12:00:00Z" />
    );

    const activeDays = container.querySelectorAll('[data-active="true"]');
    expect(activeDays).toHaveLength(2);
  });

  it('handles streak spanning full week', () => {
    // Streak is 7, last win is today
    // Should mark all 7 days as active
    const { container } = render(
      <StreakCalendar currentStreak={7} lastWinDate="2024-02-14T12:00:00Z" />
    );

    const activeDays = container.querySelectorAll('[data-active="true"]');
    expect(activeDays).toHaveLength(7);
  });
});
