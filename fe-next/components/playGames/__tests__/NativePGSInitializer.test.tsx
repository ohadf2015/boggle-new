import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import NativePGSInitializer from '@/components/NativePGSInitializer';

const isAndroid = vi.fn();
const initializePlayGames = vi.fn();
const signInPlayGames = vi.fn();

vi.mock('@/utils/platform', () => ({ isAndroid: () => isAndroid() }));
vi.mock('@/utils/nativePGS', () => ({
  initializePlayGames: () => initializePlayGames(),
  signInPlayGames: () => signInPlayGames(),
}));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('NativePGSInitializer', () => {
  beforeEach(() => {
    isAndroid.mockReturnValue(true);
    initializePlayGames.mockResolvedValue(true);
    signInPlayGames.mockResolvedValue({ success: true, playerName: 'Lex' });
  });
  afterEach(() => vi.clearAllMocks());

  it('attempts best-effort sign-in once the bridge is ready (resurrects the award path)', async () => {
    render(<NativePGSInitializer />);
    await waitFor(() => expect(signInPlayGames).toHaveBeenCalledTimes(1));
  });

  it('does NOT sign in when the bridge is unavailable', async () => {
    initializePlayGames.mockResolvedValue(false);
    render(<NativePGSInitializer />);
    await waitFor(() => expect(initializePlayGames).toHaveBeenCalled());
    expect(signInPlayGames).not.toHaveBeenCalled();
  });

  it('is a no-op off Android (no init, no sign-in)', async () => {
    isAndroid.mockReturnValue(false);
    render(<NativePGSInitializer />);
    await Promise.resolve();
    expect(initializePlayGames).not.toHaveBeenCalled();
    expect(signInPlayGames).not.toHaveBeenCalled();
  });
});
