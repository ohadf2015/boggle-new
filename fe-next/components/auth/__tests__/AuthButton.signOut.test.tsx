import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockSignOut } = vi.hoisted(() => ({ mockSignOut: vi.fn() }));

vi.mock('../../../lib/supabase', () => ({ signOut: mockSignOut }));
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn(), dir: 'ltr' }),
}));
vi.mock('../../../contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ style: { accentHex: null } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../Avatar', () => ({ __esModule: true, default: () => <div>Avatar</div> }));
vi.mock('../../LevelBadge', () => ({ __esModule: true, default: () => <div>Level</div> }));
vi.mock('../../XpProgressBar', () => ({ getLevelFromXp: () => 10 }));
vi.mock('../../engagement/CalendarRewardsModal', () => ({ CalendarRewardsModal: () => null }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn(() => Promise.resolve({ ok: false })) }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    profile: { id: 'u1', username: 'TestUser', display_name: 'Test User', total_xp: 1000 },
    isSupabaseEnabled: true,
    loading: false,
    isAdmin: false,
    user: { id: 'u1' },
  }),
}));
vi.mock('@/hooks/useCrazyGamesAuth', () => ({
  useCrazyGamesAuth: () => ({
    isCrazyGames: false,
    isReady: true,
    user: null,
    isLoggedIn: false,
    isLoggingIn: false,
    login: vi.fn(),
    isAccountAvailable: false,
  }),
}));

import AuthButton from '../AuthButton';

describe('AuthButton sign-out', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
  });

  it('signs out through the client', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    render(<AuthButton inline />);
    const button = screen.getByRole('button', { name: 'auth.signOut' });
    fireEvent.click(button);
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('lets the player try again when signing out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('chunk failed'));
    render(<AuthButton inline />);
    const button = screen.getByRole('button', { name: 'auth.signOut' });
    fireEvent.click(button);
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
