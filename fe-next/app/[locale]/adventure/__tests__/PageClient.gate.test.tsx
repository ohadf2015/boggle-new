import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('next/dynamic', () => ({
  default: vi.fn((loader) => {
    // Return a mock component that loads dynamically
    return vi.fn(() => <div data-testid="adventure-view" />);
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthState(),
}));

let useAuthState = () => ({
  canSeeInWorkModes: false,
  loading: true,
  user: null,
  profile: null,
  isAuthenticated: false,
});

import AdventurePageClient from '../PageClient';

beforeEach(() => {
  replace.mockClear();
  useAuthState = () => ({
    canSeeInWorkModes: false,
    loading: true,
    user: null,
    profile: null,
    isAuthenticated: false,
  });
});

describe('AdventurePageClient — public (GA)', () => {
  const states = {
    guest: { canSeeInWorkModes: false, loading: false, user: null, profile: null, isAuthenticated: false },
    'signed-in regular player': { canSeeInWorkModes: false, loading: false, user: { id: 'u1' }, profile: { id: 'p1', is_beta_tester: false }, isAuthenticated: true },
    'beta tester': { canSeeInWorkModes: true, loading: false, user: { id: 'u1' }, profile: { id: 'p1', is_beta_tester: true }, isAuthenticated: true },
  } as const;

  for (const [who, state] of Object.entries(states)) {
    it(`given a ${who}, when it renders, then AdventureView mounts and nothing redirects`, () => {
      useAuthState = () => state as ReturnType<typeof useAuthState>;
      render(<AdventurePageClient />);
      expect(screen.getByTestId('adventure-view')).toBeInTheDocument();
      expect(replace).not.toHaveBeenCalled();
    });
  }
});
