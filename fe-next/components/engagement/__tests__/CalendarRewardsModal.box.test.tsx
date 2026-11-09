/** Opening a calendar mystery box tells the player what the server put in it. */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fx = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ toast: { success: fx.success, error: fx.error } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'p1' } }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: vi.fn(async () => ({
    ok: true,
    json: async () => ({ month: 11, year: 2026, daysClaimed: [], currentDay: 7, canClaimToday: true, rewards: [{ day: 7, type: 'mystery_box', rarity: 'common', isMilestone: true }] }),
  })),
  postWithAuth: vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, reward: { day: 7, type: 'mystery_box', rarity: 'common' }, appliedReward: { type: 'mystery_box', rarity: 'common', contents: { type: 'xp', amount: 100 } } }),
  })),
}));

import { CalendarRewardsModal } from '../CalendarRewardsModal';

describe('CalendarRewardsModal mystery box', () => {
  it('Given a box that held XP, When claimed, Then the toast names the XP the server paid', async () => {
    render(<CalendarRewardsModal isOpen onClose={() => {}} />);
    fireEvent.click(await screen.findByText('calendar.claimToday'));
    await waitFor(() => expect(fx.success).toHaveBeenCalled());
    expect(fx.success.mock.calls[0][0]).toBe('+100 XP claimed!');
  });
});
