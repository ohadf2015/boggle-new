/**
 * LobbyAvatarRewardButton — compact lobby reward that grants a daily premium
 * avatar part for a watched ad. Presentational shell over useDailyAvatarPart;
 * fires a pixi burst on a successful claim.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

type HookState = {
  shouldRender: boolean;
  eligible: boolean;
  exhausted: boolean;
  cooldownActive: boolean;
  remainingLabel: string | null;
  granted: string | null;
  modalOpen: boolean;
  openModal: ReturnType<typeof vi.fn>;
  closeModal: ReturnType<typeof vi.fn>;
  claim: ReturnType<typeof vi.fn>;
};

let hookState: HookState;

vi.mock('@/hooks/useDailyAvatarPart', () => ({
  useDailyAvatarPart: () => hookState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      let out = key;
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
      return out;
    },
  }),
}));

const spawnBurst = vi.fn();
vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: { isInitialized: () => true, spawnBurst: (...a: unknown[]) => spawnBurst(...a) },
}));

// Stub the modal: expose its open state and let tests drive onClaim.
vi.mock('@/components/avatar/DailyPartClaimModal', () => ({
  DailyPartClaimModal: ({ isOpen, onClaim }: { isOpen: boolean; onClaim: () => void }) =>
    isOpen ? <button data-testid="stub-claim" onClick={onClaim}>claim</button> : null,
}));

import { LobbyAvatarRewardButton } from '../LobbyAvatarRewardButton';

function baseState(over: Partial<HookState> = {}): HookState {
  return {
    shouldRender: true,
    eligible: true,
    exhausted: false,
    cooldownActive: false,
    remainingLabel: null,
    granted: null,
    modalOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    claim: vi.fn().mockResolvedValue('accessories:halo'),
    ...over,
  };
}

describe('LobbyAvatarRewardButton', () => {
  beforeEach(() => {
    spawnBurst.mockClear();
    hookState = baseState();
  });

  it('renders nothing when the hook says it should not render', () => {
    hookState = baseState({ shouldRender: false });
    const { container } = render(<LobbyAvatarRewardButton />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the user already owns every part (exhausted)', () => {
    hookState = baseState({ exhausted: true });
    const { container } = render(<LobbyAvatarRewardButton />);
    expect(container.firstChild).toBeNull();
  });

  it('shows an enabled CTA when eligible and opens the modal on click', () => {
    render(<LobbyAvatarRewardButton />);
    const btn = screen.getByTestId('lobby-avatar-reward');
    expect(btn).not.toHaveProperty('disabled', true);
    fireEvent.click(btn);
    expect(hookState.openModal).toHaveBeenCalledTimes(1);
  });

  it('shows the cooldown countdown and disables the button when on cooldown', () => {
    hookState = baseState({ eligible: false, cooldownActive: true, remainingLabel: '3h 20m' });
    render(<LobbyAvatarRewardButton />);
    const btn = screen.getByTestId('lobby-avatar-reward') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('3h 20m');
    fireEvent.click(btn);
    expect(hookState.openModal).not.toHaveBeenCalled();
  });

  it('claims and fires a pixi burst on success', async () => {
    hookState = baseState({ modalOpen: true });
    render(<LobbyAvatarRewardButton />);
    fireEvent.click(screen.getByTestId('stub-claim'));
    await waitFor(() => expect(hookState.claim).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(spawnBurst).toHaveBeenCalledTimes(1));
    expect(spawnBurst.mock.calls[0][0]).toBe('sparkle-gold');
  });
});
