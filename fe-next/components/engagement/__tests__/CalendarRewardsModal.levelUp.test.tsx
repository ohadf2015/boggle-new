import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fx = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: fx.publish }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'p1' } }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: vi.fn(async () => ({
    ok: true,
    json: async () => ({ month: 11, year: 2026, daysClaimed: [], currentDay: 4, canClaimToday: true, rewards: [{ day: 4, type: 'xp', amount: 100 }] }),
  })),
  postWithAuth: vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, reward: { day: 4, type: 'xp', amount: 100 }, appliedReward: { type: 'xp', amount: 100 }, levelUp: { oldLevel: 8, newLevel: 9 } }),
  })),
}));

import { CalendarRewardsModal } from '../CalendarRewardsModal';

describe('CalendarRewardsModal level-up', () => {
  it('Given the claimed XP crossed a level, When claimed, Then the level-up is announced as calendar', async () => {
    render(<CalendarRewardsModal isOpen onClose={() => {}} />);
    fireEvent.click(await screen.findByText('calendar.claimToday'));
    await waitFor(() => expect(fx.publish).toHaveBeenCalledWith({ oldLevel: 8, newLevel: 9 }, 'calendar'));
  });
});
