import React from 'react';
import { render, screen } from '@testing-library/react';
import { xpForLevel } from '@/shared/xp/levelCurve';

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
vi.mock('../../LevelBadge', () => ({ __esModule: true, default: ({ level }: { level: number }) => <div data-testid="level-badge">{level}</div> }));
vi.mock('../../engagement/CalendarRewardsModal', () => ({ CalendarRewardsModal: () => null }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn(() => Promise.resolve({ ok: false })) }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    profile: { id: 'u1', username: 'TestUser', display_name: 'Test User', total_xp: xpForLevel(6) },
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

describe('AuthButton level ring', () => {
  it('Given a signed-in player, Then the avatar sits in the XP ring and the badge shows the XP level', () => {
    render(<AuthButton />);
    expect(screen.getByTestId('level-ring')).toBeInTheDocument();
    expect(screen.getByTestId('level-badge')).toHaveTextContent('6');
  });
});
