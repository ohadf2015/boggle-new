/** A class that let the boss escape has no trophy winner on either screen (projector spotlight, phone card). */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';

const fireRankConfetti = vi.fn();
const playRoundEndCue = vi.fn(() => null);
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: (...a: unknown[]) => fireRankConfetti(...a), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: (...a: unknown[]) => playRoundEndCue(...a),
  ROUND_WIN_SOUND: '/s.mp3',
  CLASS_SWEEP_SOUND: '/s2.mp3',
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (p: Record<string, unknown>) => <img {...(p as React.ImgHTMLAttributes<HTMLImageElement>)} />,
}));
vi.mock('@/components/ui/AnimatedCounter', () => ({ default: ({ value }: { value: number }) => <span>{value}</span> }));

import { WinnerSpotlight } from '@/components/education/results/WinnerSpotlight';
import { MpMyCard } from '@/components/multiplayer/results/MpMyCard';
import { useClassroomBossStore } from '@/stores/classroomBossStore';

const t = (key: string) => key;
const ended = (status: 'escaped' | 'defeated'): ClassroomBossView => ({
  bossId: 'lexiconDragon', hp: status === 'escaped' ? 40 : 0, maxHp: 100, phase: 2, status, telegraph: null, nextAttackMs: null,
  staggers: 0, shield: 0, shieldMax: 5, combo: { count: 0, multiplier: 1, msLeft: 0 }, lastHits: [], topHitters: [], effect: null,
  pctDealt: status === 'escaped' ? 60 : 100,
});
const card = { rank: 1, winner: true, total: 2, score: 335, bestWord: null, xp: null, coins: 10, gap: null, revealed: true, t };

describe('boss lost: no winner on results', () => {
  beforeEach(() => {
    useClassroomBossStore.getState().reset();
    fireRankConfetti.mockClear();
    playRoundEndCue.mockClear();
  });
  afterEach(cleanup);

  it('given the boss escaped, then the projector names a top hitter with the boss art and no trophy, confetti or win sting', () => {
    useClassroomBossStore.getState().receiveState(ended('escaped'));
    render(<WinnerSpotlight winner={{ username: 'Avery', score: 335 }} active t={t} />);
    expect(screen.getByText('classroomBoss.topHitter')).toBeInTheDocument();
    expect(screen.queryByText(/winnerBanner/)).toBeNull();
    expect(screen.getByTestId('winner-boss-escaped')).toBeInTheDocument();
    expect(screen.queryByTestId('winner-mascot-video')).toBeNull();
    expect(fireRankConfetti).not.toHaveBeenCalled();
    expect(playRoundEndCue).not.toHaveBeenCalled();
  });

  it('given the boss escaped, then the top student\'s phone card shows a rank, not WINNER', () => {
    useClassroomBossStore.getState().receiveState(ended('escaped'));
    render(<MpMyCard {...card} />);
    expect(screen.queryByText('mpUi.results.winner')).toBeNull();
  });

  it('given the class won, then the top student still gets WINNER', () => {
    useClassroomBossStore.getState().receiveState(ended('defeated'));
    render(<MpMyCard {...card} />);
    expect(screen.getByText('mpUi.results.winner')).toBeInTheDocument();
  });
});
