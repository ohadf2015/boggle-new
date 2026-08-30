import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
const useAuth = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ language: 'en', t: (_k: string, f?: string) => f ?? _k }),
}));
vi.mock('@/components/wordTowerV2/WordTowerV2', () => ({
  default: () => <div data-testid="word-tower-v2" />,
}));

import { WordTowerV2PageClient } from '../PageClient';

beforeEach(() => {
  replace.mockClear();
});

describe('WordTowerV2PageClient beta gate', () => {
  it('given a beta tester or admin, when opened, then the game renders', async () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: true, loading: false });

    render(<WordTowerV2PageClient />);

    // next/dynamic resolves the chunk asynchronously, so the game appears a
    // tick after mount rather than synchronously.
    expect(await screen.findByTestId('word-tower-v2')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given an ordinary player, when opened, then they are sent home and see no game', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: false, loading: false });

    render(<WordTowerV2PageClient />);

    expect(screen.queryByTestId('word-tower-v2')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/en');
  });

  it('given auth still resolving, when opened, then it waits instead of bouncing', () => {
    // canSeeInWorkModes starts false and flips true once auth resolves. Redirecting
    // on that transient false throws a real beta tester back to the home page
    // before their access is even known.
    useAuth.mockReturnValue({ canSeeInWorkModes: false, loading: true });

    render(<WordTowerV2PageClient />);

    expect(replace).not.toHaveBeenCalled();
  });
});
