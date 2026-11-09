import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const boardProps = vi.fn();
vi.mock('../../TabbedDailyLeaderboard', () => ({
  default: (props: Record<string, unknown>) => {
    boardProps(props);
    return <div data-testid="tabbed-board" />;
  },
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({ getGuestFingerprint: () => Promise.resolve('fp') }));

import { DailyBoardSheet } from '../DailyBoardSheet';

describe('DailyBoardSheet', () => {
  it('opens the whole daily board in place, not via the Word Hunt page', () => {
    render(<DailyBoardSheet open onOpenChange={vi.fn()} language="he" />);
    expect(screen.getByTestId('daily-board-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('tabbed-board')).toBeInTheDocument();
    const props = boardProps.mock.calls.at(-1)?.[0];
    expect(props.maxVisible).toBeGreaterThanOrEqual(50);
    expect(props.currentPlayerId).toBe('u1');
    expect(props.defaultTab).toBe('today');
  });

  it('renders nothing while closed', () => {
    render(<DailyBoardSheet open={false} onOpenChange={vi.fn()} language="he" />);
    expect(screen.queryByTestId('daily-board-sheet')).toBeNull();
  });
});
