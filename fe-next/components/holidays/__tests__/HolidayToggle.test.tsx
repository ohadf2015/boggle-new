import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  holiday: 'christmas' as 'christmas' | 'hanukkah' | null,
  resolved: true,
  region: 'world' as const,
  available: ['hanukkah', 'christmas'] as ('hanukkah' | 'christmas')[],
  setOverride: vi.fn(),
};
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => state }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import HolidayToggle from '../HolidayToggle';

beforeEach(() => {
  Object.assign(state, { holiday: 'christmas', resolved: true, available: ['hanukkah', 'christmas'] });
  state.setOverride.mockClear();
});

describe('HolidayToggle', () => {
  it('given both holidays open, offers both plus off with the current one pressed', () => {
    render(<HolidayToggle />);
    expect(screen.getByRole('button', { name: 'holiday.toggle.christmas' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'holiday.toggle.hanukkah' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'holiday.toggle.off' })).toBeTruthy();
  });

  it('switching sets the override', () => {
    render(<HolidayToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'holiday.toggle.hanukkah' }));
    expect(state.setOverride).toHaveBeenCalledWith('hanukkah');
    fireEvent.click(screen.getByRole('button', { name: 'holiday.toggle.off' }));
    expect(state.setOverride).toHaveBeenCalledWith('off');
  });

  it('given only the non-default holiday open and theme off, still offers it', () => {
    Object.assign(state, { holiday: null, available: ['hanukkah'] });
    render(<HolidayToggle />);
    expect(screen.getByRole('button', { name: 'holiday.toggle.hanukkah' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'holiday.toggle.off' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('renders nothing until resolved or outside every window', () => {
    Object.assign(state, { resolved: false });
    const { container, rerender } = render(<HolidayToggle />);
    expect(container.innerHTML).toBe('');
    Object.assign(state, { resolved: true, available: [] });
    rerender(<HolidayToggle />);
    expect(container.innerHTML).toBe('');
  });
});
