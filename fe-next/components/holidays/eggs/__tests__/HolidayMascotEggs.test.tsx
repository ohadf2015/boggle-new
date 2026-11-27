import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const holidayState = vi.fn();
const sounds = { playTileSelectSound: vi.fn(), playWheelSpinSound: vi.fn(), playPowerUpSound: vi.fn() };
const lang = vi.fn();
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holidayState() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sounds }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: lang() }) }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => false }));

import HolidayMascotEggs from '../HolidayMascotEggs';
import { HOLIDAY_EGG_EVENT, resetHolidayClientForTests } from '@/lib/holidays/holidayClient';
import { SNOWBALL_EVENT, SNOWGLOBE_EVENT } from '../eggEvents';

{/* eslint-disable-next-line @next/next/no-img-element */}
const Mascot = () => <img data-testid="mascot" alt="" />;

describe('HolidayMascotEggs', () => {
  beforeEach(() => {
    resetHolidayClientForTests();
    lang.mockReturnValue('en');
    document.documentElement.className = 'holiday-hanukkah holiday-live';
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date(2026, 11, 6, 12));
    Object.values(sounds).forEach((s) => s.mockReset());
  });

  it('Given no holiday, then the mascot stays a plain, untappable image', () => {
    holidayState.mockReturnValue({ holiday: null, resolved: true });
    render(<HolidayMascotEggs><Mascot /></HolidayMascotEggs>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
  });

  it('Given Hanukkah, when tapped 8 times quickly, then it spins like a dreidel once', () => {
    holidayState.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    const heard = vi.fn();
    window.addEventListener(HOLIDAY_EGG_EVENT, heard);
    render(<HolidayMascotEggs><Mascot /></HolidayMascotEggs>);
    const btn = screen.getByTestId('holiday-mascot-eggs');
    for (let i = 0; i < 7; i++) fireEvent.click(btn);
    expect(btn.className).not.toContain('holiday-mascot-spin');
    fireEvent.click(btn);
    expect(btn.className).toContain('holiday-mascot-spin');
    expect(sounds.playWheelSpinSound).toHaveBeenCalledTimes(1);
    expect((heard.mock.calls[0][0] as CustomEvent).detail.egg).toBe('mascot_spin');
    window.removeEventListener(HOLIDAY_EGG_EVENT, heard);
  });

  it('Given Christmas, when tapped 12 times, then a snowball fight starts; slow taps never count', () => {
    holidayState.mockReturnValue({ holiday: 'christmas', resolved: true });
    document.documentElement.className = 'holiday-christmas holiday-live';
    vi.setSystemTime(new Date(2026, 11, 20, 12));
    const snow = vi.fn();
    window.addEventListener(SNOWBALL_EVENT, snow);
    render(<HolidayMascotEggs><Mascot /></HolidayMascotEggs>);
    const btn = screen.getByTestId('holiday-mascot-eggs');
    for (let i = 0; i < 12; i++) {
      fireEvent.click(btn);
      vi.setSystemTime(new Date(Date.now() + 2000));
    }
    expect(snow).not.toHaveBeenCalled();
    for (let i = 0; i < 12; i++) fireEvent.click(btn);
    expect(snow).toHaveBeenCalledTimes(1);
    window.removeEventListener(SNOWBALL_EVENT, snow);
  });

  it('Given a 2s long-press, then the snow globe opens', () => {
    holidayState.mockReturnValue({ holiday: 'christmas', resolved: true });
    const globe = vi.fn();
    window.addEventListener(SNOWGLOBE_EVENT, globe);
    render(<HolidayMascotEggs><Mascot /></HolidayMascotEggs>);
    fireEvent.pointerDown(screen.getByTestId('holiday-mascot-eggs'));
    vi.advanceTimersByTime(2000);
    expect(globe).toHaveBeenCalledTimes(1);
    window.removeEventListener(SNOWGLOBE_EVENT, globe);
  });

  it('Given a Swedish player on Lucia day, then the Lucia mascot takes over', () => {
    holidayState.mockReturnValue({ holiday: 'christmas', resolved: true });
    lang.mockReturnValue('sv');
    vi.setSystemTime(new Date(2026, 11, 13, 9));
    render(<HolidayMascotEggs><Mascot /></HolidayMascotEggs>);
    expect(screen.queryByTestId('mascot')).toBeNull();
    expect(screen.getByTestId('holiday-mascot-eggs').querySelector('img')?.getAttribute('src')).toBe('/holidays/m-lucia.webp');
  });
});
