import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const holidayState = vi.fn();
const sounds = { playCoinCollectSound: vi.fn(), playAchievementSound: vi.fn() };
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holidayState() }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sounds }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => true }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

import HolidayHideSpot from '../HolidayHideSpot';
import { resetHolidayClientForTests } from '@/lib/holidays/holidayClient';

const fetchMock = vi.fn();
const huntState = { slot: 'profile', item: 'gelt', foundToday: false, count: 3, goal: 8, seeker: false };

describe('HolidayHideSpot', () => {
  beforeEach(() => {
    resetHolidayClientForTests();
    document.documentElement.className = 'holiday-hanukkah';
    holidayState.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    fetchMock.mockReset().mockImplementation(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => (init?.method === 'POST' ? { ...huntState, status: 'found', foundToday: true, count: 4, seekerJustEarned: false } : huntState),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('Given today hides the gelt on another screen, then this spot renders nothing', async () => {
    const { container } = render(<HolidayHideSpot slot="settings" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('Given the holiday has not resolved, then nothing renders and nothing is fetched', () => {
    holidayState.mockReturnValue({ holiday: null, resolved: false });
    const { container } = render(<HolidayHideSpot slot="profile" />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given it hides here, when tapped, then it is collected with sound and the server records this screen', async () => {
    render(<HolidayHideSpot slot="profile" />);
    const btn = await screen.findByRole('button', { name: /holiday\.hunt\.itemLabel/ });
    expect(btn.querySelector('img')?.getAttribute('src')).toBe('/holidays/peek-gelt.webp');
    fireEvent.click(btn);
    expect(sounds.playCoinCollectSound).toHaveBeenCalled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ slot: 'profile', holiday: 'hanukkah' });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('holiday.hunt.found'));
  });
});
