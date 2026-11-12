import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/*
 * On a phone the purple title badge sat beside the name, where it truncated to a
 * bare crown and squeezed the viewer's own short name to "F…". It now gets the
 * second line, above nothing but the stats, so name and title each keep room.
 */

vi.mock('framer-motion', () => ({
  m: { div: ({ children, initial: _i, animate: _a, transition: _t, ...rest }: Record<string, unknown>) => <div {...(rest as object)}>{children as React.ReactNode}</div> },
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/friends/FriendQuickAction', () => ({ FriendQuickAction: () => null }));
vi.mock('@/components/records/RecordHolderCrown', () => ({ RecordHolderCrown: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

import { TodayParticipantRow } from '../DailyLeaderboardRow';
import type { DailyParticipant } from '../leaderboardTypes';

const fish = {
  rank_position: 2,
  player_id: 'u1',
  guest_fingerprint: null,
  display_name: 'Fish',
  score: 3443,
  title: 'GRANDMASTER',
  played_modes: ['word-wheel', 'word-hunt'],
  by_mode: { 'word-wheel': 2496, 'word-hunt': 817 },
} as unknown as DailyParticipant;

describe('TodayParticipantRow title badge', () => {
  it('puts the title on the stats line, not squeezed beside the name', () => {
    render(<TodayParticipantRow participant={fish} index={0} isCurrentUser compact={false} t={(k) => k} />);
    const name = screen.getByText('Fish');
    const badge = screen.getByTestId('title-badge');
    expect(name.parentElement).not.toContainElement(badge);
    // Same line as the per-mode scores.
    expect(badge.parentElement).toHaveTextContent('2496');
  });

  it('leaves no empty stats line for a player with no title and no stats', () => {
    const plain = { ...fish, title: null, played_modes: ['word-wheel'] } as unknown as DailyParticipant;
    render(<TodayParticipantRow participant={plain} index={0} isCurrentUser={false} compact={false} t={(k) => k} />);
    expect(screen.queryByTestId('title-badge')).toBeNull();
  });
});
