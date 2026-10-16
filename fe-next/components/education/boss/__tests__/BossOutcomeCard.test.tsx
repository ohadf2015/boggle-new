import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key), language: 'en' }),
}));

import { BossOutcomeCard } from '../BossOutcomeCard';
import { useClassroomBossStore } from '@/stores/classroomBossStore';

const view = (over: Partial<ClassroomBossView>): ClassroomBossView => ({
  bossId: 'lexiconDragon', hp: 40, maxHp: 100, phase: 2, status: 'escaped', telegraph: null, nextAttackMs: null, staggers: 0,
  shield: 0, shieldMax: 5, combo: { count: 0, multiplier: 1, msLeft: 0 }, lastHits: [], topHitters: [], effect: null, pctDealt: 60,
  ...over,
});

describe('BossOutcomeCard', () => {
  beforeEach(() => useClassroomBossStore.getState().reset());

  it('given the boss escaped, then it says so with the % dealt and shows no trophy', () => {
    useClassroomBossStore.getState().receiveState(view({}));
    const { container } = render(<BossOutcomeCard size="phone" />);
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-outcome', 'escaped');
    expect(screen.getByText(/classroomBoss\.escaped/)).toBeInTheDocument();
    expect(screen.getByText(/"pct":60/)).toBeInTheDocument();
    expect(container.querySelector('.lucide-trophy')).toBeNull();
  });

  it('given the class defeated the boss, then the card is a win with a trophy', () => {
    useClassroomBossStore.getState().receiveState(view({ status: 'defeated', hp: 0, pctDealt: 100 }));
    const { container } = render(<BossOutcomeCard size="tv" />);
    expect(screen.getByText(/classroomBoss\.defeated/)).toBeInTheDocument();
    expect(container.querySelector('.lucide-trophy')).not.toBeNull();
  });

  it('given the fight is still on (or no boss), then nothing renders', () => {
    useClassroomBossStore.getState().receiveState(view({ status: 'fighting' }));
    render(<BossOutcomeCard size="phone" />);
    expect(screen.queryByTestId('boss-outcome')).toBeNull();
  });

  const hitters = [{ username: 'Maya', dmg: 41 }, { username: 'Leo', dmg: 27 }, { username: 'Noa', dmg: 19 }, { username: 'Ari', dmg: 4 }];

  it('given the fight is over, then the top three hitters are named with their damage, best first', () => {
    useClassroomBossStore.getState().receiveState(view({ topHitters: hitters }));
    render(<BossOutcomeCard size="tv" />);
    const rows = screen.getAllByTestId('boss-top-hitter');
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute('data-username'))).toEqual(['Maya', 'Leo', 'Noa']);
    expect(rows[0]).toHaveTextContent('eduResultsV3.bossDamage:{"dmg":41}');
  });

  it('given the boss escaped, then it shows how much health it ran off with', () => {
    useClassroomBossStore.getState().receiveState(view({ hp: 38, maxHp: 100 }));
    render(<BossOutcomeCard size="phone" />);
    expect(screen.getByTestId('boss-hp-left')).toHaveTextContent('classroomBoss.hpLeft:{"pct":38}');
  });

  it('given the class defeated it, then no health is left to report', () => {
    useClassroomBossStore.getState().receiveState(view({ status: 'defeated', hp: 0, pctDealt: 100 }));
    render(<BossOutcomeCard size="tv" />);
    expect(screen.queryByTestId('boss-hp-left')).toBeNull();
  });

  it('given the class blocked attacks, then the card counts them; none blocked, no chip', () => {
    useClassroomBossStore.getState().receiveState(view({ staggers: 2 }));
    const { unmount } = render(<BossOutcomeCard size="tv" />);
    expect(screen.getByTestId('boss-staggers')).toHaveTextContent('eduResultsV3.bossStaggers:{"count":2}');
    unmount();
    useClassroomBossStore.getState().receiveState(view({ staggers: 0 }));
    render(<BossOutcomeCard size="tv" />);
    expect(screen.queryByTestId('boss-staggers')).toBeNull();
  });
});
