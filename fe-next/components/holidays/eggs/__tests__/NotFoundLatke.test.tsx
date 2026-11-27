import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import NotFoundLatke from '../NotFoundLatke';
import { __resetHolidayStore } from '@/lib/holidays/holidayDom';
import { resetHolidayClientForTests } from '@/lib/holidays/holidayClient';

beforeEach(() => {
  __resetHolidayStore();
  resetHolidayClientForTests();
});

describe('NotFoundLatke (root 404, no app providers)', () => {
  it('Given the pre-paint script set a holiday class, then the lost latke and its line show', () => {
    document.documentElement.className = 'holiday-hanukkah holiday-live';
    render(<NotFoundLatke text="Lost like a latke" label="Poke the latke" />);
    expect(screen.getByText('Lost like a latke')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poke the latke' })).toBeInTheDocument();
  });

  it('Given only the Dec 1 coming-soon preview, then the latke stays hidden', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-02T12:00:00'));
    document.documentElement.className = 'holiday-hanukkah holiday-preview';
    const { container } = render(<NotFoundLatke text="x" label="y" />);
    expect(container.querySelector('button')).toBeNull();
    vi.useRealTimers();
  });

  it('Given no holiday is on, then nothing renders', () => {
    document.documentElement.className = '';
    const { container } = render(<NotFoundLatke text="x" label="y" />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('Given the holiday class, when something strips it from <html>, then it is put back', async () => {
    document.documentElement.className = 'holiday-christmas holiday-live';
    render(<NotFoundLatke text="x" label="y" />);
    await act(async () => {
      document.documentElement.classList.remove('holiday-christmas');
      await Promise.resolve();
    });
    expect(document.documentElement.classList.contains('holiday-christmas')).toBe(true);
  });
});
