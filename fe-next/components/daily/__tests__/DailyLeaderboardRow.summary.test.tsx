import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

/*
 * Tapping a player's avatar (or name) on the daily board opens their summary
 * card. The combined board is id-free, so signed-in rows hand the card their
 * row key to resolve; guest rows and the viewer's own row open nothing.
 */

vi.mock('framer-motion', () => ({
  m: { div: ({ children, initial: _i, animate: _a, transition: _t, ...rest }: Record<string, unknown>) => <div {...(rest as object)}>{children as React.ReactNode}</div> },
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/friends/FriendQuickAction', () => ({ FriendQuickAction: () => null }));
vi.mock('@/components/records/RecordHolderCrown', () => ({ RecordHolderCrown: () => null }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/players/PlayerSummaryDialog', () => ({
  PlayerSummaryDialog: ({ player, open }: { player: { id?: string | null; boardKey?: string | null; title?: string | null }; open: boolean }) =>
    open ? <div data-testid="summary" data-id={player.id ?? ''} data-key={player.boardKey ?? ''} data-title={player.title ?? ''} /> : null,
}));

import { TodayParticipantRow } from '../DailyLeaderboardRow';
import type { DailyParticipant } from '../leaderboardTypes';

const base = {
  rank_position: 4,
  guest_fingerprint: null,
  display_name: 'Noa',
  score: 900,
  title: 'WORDSMITH',
} as const;

const row = (over: Partial<DailyParticipant>) => ({ ...base, player_id: null, ...over }) as unknown as DailyParticipant;

describe('TodayParticipantRow player summary', () => {
  it('opens the card from the avatar with the player id', () => {
    render(<TodayParticipantRow participant={row({ player_id: 'u1' })} index={0} isCurrentUser={false} compact={false} t={(k) => k} />);
    fireEvent.click(screen.getByRole('button', { name: 'playerSummary.openFor' }));
    const card = screen.getByTestId('summary');
    expect(card).toHaveAttribute('data-id', 'u1');
    expect(card).toHaveAttribute('data-title', 'WORDSMITH');
  });

  it('hands a signed-in row on the id-free board its row key', () => {
    render(<TodayParticipantRow participant={row({ row_key: 'abcdefgh12', is_member: true })} index={0} isCurrentUser={false} compact={false} t={(k) => k} />);
    fireEvent.click(screen.getByText('Noa'));
    expect(screen.getByTestId('summary')).toHaveAttribute('data-key', 'abcdefgh12');
  });

  it('opens nothing for a guest row or the viewer\'s own row', () => {
    const { unmount } = render(<TodayParticipantRow participant={row({ row_key: 'abcdefgh12' })} index={0} isCurrentUser={false} compact={false} t={(k) => k} />);
    expect(screen.queryByRole('button', { name: 'playerSummary.openFor' })).toBeNull();
    unmount();
    render(<TodayParticipantRow participant={row({ player_id: 'me' })} index={0} isCurrentUser compact={false} t={(k) => k} />);
    expect(screen.queryByRole('button', { name: 'playerSummary.openFor' })).toBeNull();
  });
});
