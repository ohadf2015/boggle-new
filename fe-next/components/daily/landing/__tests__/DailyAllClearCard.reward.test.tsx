import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { postWithAuth, emitCoinEarned, useAuth } = vi.hoisted(() => ({
  postWithAuth: vi.fn(),
  emitCoinEarned: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${JSON.stringify(p)}` : k),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth }));
vi.mock('@/utils/coinEarnedFx', () => ({ emitCoinEarned }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));

import { DailyAllClearCard } from '../DailyAllClearCard';

const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe('DailyAllClearCard reward', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('claims once, shows what was earned and flies the coins', async () => {
    postWithAuth.mockResolvedValue(ok({ claimed: true, coins: 50, xp: 100 }));
    render(<DailyAllClearCard streak={2} />);
    const chip = await screen.findByTestId('all-clear-reward');
    expect(chip.textContent).toContain('"coins":50');
    expect(chip.textContent).toContain('"xp":100');
    expect(postWithAuth).toHaveBeenCalledTimes(1);
    expect(postWithAuth.mock.calls[0][0]).toBe('/api/daily/all-clear/claim');
    expect(emitCoinEarned).toHaveBeenCalledWith(50);
  });

  it('on a revisit still shows the reward but does not fly coins again', async () => {
    postWithAuth.mockResolvedValue(ok({ claimed: false, coins: 50, xp: 100 }));
    render(<DailyAllClearCard streak={2} />);
    await screen.findByTestId('all-clear-reward');
    expect(emitCoinEarned).not.toHaveBeenCalled();
  });

  it('shows no reward chip and does not crash when the claim fails', async () => {
    postWithAuth.mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<DailyAllClearCard streak={2} />);
    await waitFor(() => expect(postWithAuth).toHaveBeenCalled());
    expect(screen.queryByTestId('all-clear-reward')).toBeNull();
    expect(screen.getByTestId('daily-all-clear')).toBeTruthy();
  });

  it('does not throw when the request rejects', async () => {
    postWithAuth.mockRejectedValue(new Error('offline'));
    render(<DailyAllClearCard streak={0} />);
    await waitFor(() => expect(postWithAuth).toHaveBeenCalled());
    expect(screen.queryByTestId('all-clear-reward')).toBeNull();
  });

  it('guests get a sign-up nudge naming the reward and never call the API', () => {
    useAuth.mockReturnValue({ user: null });
    render(<DailyAllClearCard streak={1} />);
    expect(screen.getByTestId('all-clear-guest-nudge').textContent).toContain('"coins":50');
    expect(postWithAuth).not.toHaveBeenCalled();
  });

  it('wears the reward art as a decorative tile (hidden from assistive tech)', () => {
    useAuth.mockReturnValue({ user: null });
    render(<DailyAllClearCard streak={0} />);
    const art = screen.getByTestId('all-clear-art');
    expect(art.getAttribute('aria-hidden')).toBe('true');
    expect(art.getAttribute('style')).toContain('/daily/all-clear-coin.webp');
  });
});
