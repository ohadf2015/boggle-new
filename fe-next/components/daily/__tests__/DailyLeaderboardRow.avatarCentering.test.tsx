/**
 * Regression: daily leaderboard avatars were not centered inside the image
 * circle on phones (reported 2026-11-14, /he/daily, viewport 411px). #1917
 * made the SVG fill its tile; this guards the remaining half — the row's
 * circle is `w-10 h-10` at mobile and `sm:w-12 sm:h-12` at desktop, while
 * Avatar's `size="lg"` emits its own `w-12 h-12` container classes. A plain
 * `w-full h-full` races those in the generated stylesheet (whichever utility
 * lands later wins), so the tile could still render 48px inside a 40px
 * overflow-hidden circle, clipped at the start edge instead of centered. The
 * important modifier (`!w-full !h-full`, the pattern the education projector
 * rosters already use) makes the fill deterministic.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: ({ children, initial: _i, animate: _a, transition: _t, ...rest }: Record<string, unknown>) => <div {...(rest as object)}>{children as React.ReactNode}</div> },
}));

let capturedClassName: string | undefined;
vi.mock('@/components/Avatar', () => ({
  default: ({ className }: { className?: string }) => {
    capturedClassName = className;
    return <span data-testid="avatar" />;
  },
}));
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/players/PlayerSummaryTrigger', () => ({ PlayerSummaryTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/friends/FriendQuickAction', () => ({ FriendQuickAction: () => null }));
vi.mock('@/components/records/RecordHolderCrown', () => ({ RecordHolderCrown: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

import { TodayParticipantRow } from '../DailyLeaderboardRow';
import type { DailyParticipant } from '../leaderboardTypes';

const player = {
  rank_position: 4,
  player_id: 'u1',
  guest_fingerprint: null,
  display_name: 'Ron',
  score: 1200,
  played_modes: ['word-wheel'],
} as unknown as DailyParticipant;

describe('DailyLeaderboardRow avatar centering', () => {
  it('forces the Avatar tile to fill the responsive circle at every breakpoint', () => {
    render(<TodayParticipantRow participant={player} index={0} isCurrentUser={false} compact={false} t={(k) => k} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(capturedClassName).toContain('!w-full');
    expect(capturedClassName).toContain('!h-full');
  });
});
