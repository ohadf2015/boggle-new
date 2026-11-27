import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Key = 'hanukkah' | 'christmas';
const state = {
  theme: 'christmas' as Key | null,
  resolved: true,
  available: ['hanukkah', 'christmas'] as Key[],
  canSwap: true,
  swap: vi.fn(async () => true),
};
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => state }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { error: (m: string) => toastError(m) } }));

import { OwnHolidayBadge, PlayerHolidayBadge } from '../HolidayProfileBadge';

beforeEach(() => {
  Object.assign(state, { theme: 'christmas', resolved: true, available: ['hanukkah', 'christmas'], canSwap: true });
  state.swap.mockReset();
  state.swap.mockResolvedValue(true);
  toastError.mockReset();
});

describe('OwnHolidayBadge', () => {
  it('given the christmas theme, shows the tree art and a swap to hanukkah', () => {
    render(<OwnHolidayBadge />);
    const badge = screen.getByTestId('holiday-profile-badge');
    expect(badge.getAttribute('data-holiday')).toBe('christmas');
    expect(badge.querySelector('img')?.getAttribute('src')).toContain('m-christmas-tree.webp');
    expect(screen.getByRole('button').getAttribute('aria-label')).toContain('holiday.badge.swap');
    expect(screen.getByRole('button').getAttribute('aria-label')).toContain('holiday.badge.hanukkah');
  });

  it('tapping swap calls swap once', async () => {
    render(<OwnHolidayBadge />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(state.swap).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('given the save fails, tells the player', async () => {
    state.swap.mockResolvedValue(false);
    render(<OwnHolidayBadge />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(toastError).toHaveBeenCalledWith('holiday.badge.swapError');
  });

  it('given the holiday is not resolved yet, renders nothing so the wrong one never flashes', () => {
    state.resolved = false;
    const { container } = render(<OwnHolidayBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('given no holiday season, renders nothing', () => {
    state.theme = null;
    const { container } = render(<OwnHolidayBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('given swapping is not possible, shows the badge without a button', () => {
    state.canSwap = false;
    render(<OwnHolidayBadge />);
    expect(screen.getByTestId('holiday-profile-badge')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('PlayerHolidayBadge', () => {
  it('shows the saved holiday with no swap', () => {
    render(<PlayerHolidayBadge holidayKey="hanukkah" countryCode="US" />);
    expect(screen.getByTestId('holiday-profile-badge').getAttribute('data-holiday')).toBe('hanukkah');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('given no saved holiday, falls back to their country', () => {
    render(<PlayerHolidayBadge holidayKey={null} countryCode="IL" />);
    expect(screen.getByTestId('holiday-profile-badge').getAttribute('data-holiday')).toBe('hanukkah');
  });

  it('given neither a saved holiday nor a country, renders nothing', () => {
    const { container } = render(<PlayerHolidayBadge holidayKey={null} countryCode={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('given their holiday window is closed, renders nothing', () => {
    state.available = ['christmas'];
    const { container } = render(<PlayerHolidayBadge holidayKey="hanukkah" countryCode="IL" />);
    expect(container.innerHTML).toBe('');
  });
});
