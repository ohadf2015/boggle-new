/**
 * PracticeCoachTip surfaces the same 3 tutorial tips the pre-game intro shows,
 * but rotates them inline during play so the player can keep referring back
 * without leaving the board. Auto-advances on a timer; dismisses on demand.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string) => k, // identity so we can assert on key strings
  }),
}));

import PracticeCoachTip from '../PracticeCoachTip';

describe('PracticeCoachTip', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the first tutorial tip on mount', () => {
    render(<PracticeCoachTip mode="classic" />);
    expect(screen.getByText('gameModes.classic.tutorial.tip1')).toBeInTheDocument();
  });

  it('advances to tip2 after the rotate interval', () => {
    render(<PracticeCoachTip mode="classic" rotateMs={5000} />);
    act(() => { vi.advanceTimersByTime(5100); });
    expect(screen.getByText('gameModes.classic.tutorial.tip2')).toBeInTheDocument();
  });

  it('hides itself once the player dismisses it', () => {
    render(<PracticeCoachTip mode="wordHunt" />);
    fireEvent.click(screen.getByRole('button', { name: /practice\.coach\.dismiss/ }));
    expect(screen.queryByText(/gameModes\.wordHunt\.tutorial\.tip/)).not.toBeInTheDocument();
  });

  it('auto-dismisses when wordsFound crosses 1 (player demonstrated understanding)', () => {
    const { rerender } = render(<PracticeCoachTip mode="wheelRush" wordsFound={0} />);
    expect(screen.getByText('gameModes.wheelRush.tutorial.tip1')).toBeInTheDocument();
    rerender(<PracticeCoachTip mode="wheelRush" wordsFound={1} />);
    expect(screen.queryByText(/gameModes\.wheelRush\.tutorial\.tip/)).not.toBeInTheDocument();
  });
});
