import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const holidayState = vi.fn();
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holidayState() }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playPowerUpSound: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => false }));

import PermanentEgg from '../PermanentEgg';
import { HOLIDAY_EGG_EVENT, resetHolidayClientForTests } from '@/lib/holidays/holidayClient';

describe('PermanentEgg', () => {
  beforeEach(() => {
    resetHolidayClientForTests();
    document.documentElement.className = 'holiday-hanukkah holiday-live';
  });

  it('Given no holiday, then nothing renders', () => {
    holidayState.mockReturnValue({ holiday: null, resolved: true });
    const { container } = render(<PermanentEgg kind="lost_latke" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given the 404 during the event, then the lost latke and its line show; tapping it counts the egg', () => {
    holidayState.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    const heard = vi.fn();
    window.addEventListener(HOLIDAY_EGG_EVENT, heard);
    render(<PermanentEgg kind="lost_latke" />);
    expect(screen.getByText('holiday.eggs.permanent.lost_latke')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'holiday.eggs.permanent.lost_latkeLabel' }));
    expect((heard.mock.calls[0][0] as CustomEvent).detail.egg).toBe('lost_latke');
    window.removeEventListener(HOLIDAY_EGG_EVENT, heard);
  });

  it('Given the footer gingerbread, then its line only appears after a tap', () => {
    holidayState.mockReturnValue({ holiday: 'christmas', resolved: true });
    render(<PermanentEgg kind="gingerbread" />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status').textContent).toBe('holiday.eggs.permanent.gingerbread');
  });
});
