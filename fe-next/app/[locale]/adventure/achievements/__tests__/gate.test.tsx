import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
const useAuth = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ language: 'en', t: (k: string) => k }),
}));

import { InWorkModeShell } from '@/components/auth/InWorkModeShell';

beforeEach(() => replace.mockClear());

describe('/adventure/achievements gate', () => {
  it('given a signed-in user whose profile has not landed, when opened, then it waits', () => {
    useAuth.mockReturnValue({
      canSeeInWorkModes: false,
      loading: false,
      user: { id: 'u' },
      profile: null,
    });
    render(
      <InWorkModeShell>
        <div data-testid="achievements" />
      </InWorkModeShell>,
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('achievements')).not.toBeInTheDocument();
  });

  it('given an ordinary player, when opened, then they are sent home', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: false, loading: false, user: null, profile: null });
    render(
      <InWorkModeShell>
        <div data-testid="achievements" />
      </InWorkModeShell>,
    );
    expect(replace).toHaveBeenCalledWith('/en');
    expect(screen.queryByTestId('achievements')).not.toBeInTheDocument();
  });

  it('given a beta tester, when opened, then the page renders', () => {
    useAuth.mockReturnValue({
      canSeeInWorkModes: true,
      loading: false,
      user: { id: 'u' },
      profile: { id: 'p' },
    });
    render(
      <InWorkModeShell>
        <div data-testid="achievements" />
      </InWorkModeShell>,
    );
    expect(screen.getByTestId('achievements')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
