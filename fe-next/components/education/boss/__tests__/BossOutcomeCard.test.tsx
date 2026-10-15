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
});
