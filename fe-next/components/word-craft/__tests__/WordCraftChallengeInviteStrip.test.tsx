import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WordCraftChallengeInviteStrip } from '../WordCraftChallengeInviteStrip';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const t = (key: string, params?: unknown) =>
  typeof params === 'string' ? params : key;

function setShare(fn: ((data: unknown) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'share', { value: fn, configurable: true, writable: true });
}

describe('WordCraftChallengeInviteStrip', () => {
  afterEach(() => {
    setShare(undefined);
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://www.lexiclash.live' },
      configurable: true,
    });
  });

  it('renders the invite affordance', () => {
    render(<WordCraftChallengeInviteStrip t={t} seed={42} playerScore={30} locale="en" />);
    expect(screen.getByRole('button', { name: /wordcraft\.duel\.challengeFriend/i })).toBeTruthy();
  });

  it('shares a duel link carrying this seed + live score on click', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);

    render(
      <WordCraftChallengeInviteStrip
        t={t}
        seed={42}
        playerScore={30}
        locale="en"
        challengerName="Ada"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /wordcraft\.duel\.challengeFriend/i }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const arg = share.mock.calls[0][0] as { url: string };
    expect(arg.url).toContain('seed=42');
    expect(arg.url).toContain('duel=1');
    expect(arg.url).toContain('ds=30');
    expect(arg.url).toContain('dn=Ada');
  });
});
