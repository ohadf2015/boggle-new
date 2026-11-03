import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/wordTowerV2/rewards/GodRays', () => ({ GodRays: () => <i data-testid="rays" /> }));
vi.mock('@/components/wordTowerV2/rewards/CoinFountain', () => ({ CoinFountain: () => <i data-testid="coins" /> }));

import { DailyChest } from '../DailyChest';

describe('<DailyChest> staged reveal', () => {
  it('mounts the rays and the coin fountain on later frames than the chest burst, so no single frame pays for all of it', () => {
    vi.useFakeTimers();
    window.localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ newTotalXp: 1 }) }) as never;
    render(<DailyChest userId="s" reducedMotion={false} onGranted={vi.fn()} />);
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    act(() => { vi.advanceTimersByTime(460); });
    expect(screen.getByText('academy.student.chestCollect')).toBeInTheDocument();
    expect(screen.queryByTestId('rays')).toBeNull();
    expect(screen.queryByTestId('coins')).toBeNull();
    act(() => { vi.advanceTimersByTime(40); });
    expect(screen.getByTestId('rays')).toBeInTheDocument();
    expect(screen.queryByTestId('coins')).toBeNull();
    act(() => { vi.advanceTimersByTime(40); });
    expect(screen.getByTestId('coins')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
