/**
 * AuthButton Dropdown Position Tests
 *
 * HISTORY: this test used to guard a hand-rolled positioning bug — in RTL mode,
 * manual `getBoundingClientRect` + `window.innerWidth - rect.right` math placed
 * the dropdown on the wrong side of the screen. That entire positioning
 * mechanism (manual style.left/right + resize/scroll listeners + a `react-dom`
 * createPortal mock to inspect it) was removed when the menu was migrated onto
 * @radix-ui/react-dropdown-menu, which positions itself via its own Popper
 * anchor and reads direction from the app's ambient RadixDirectionProvider
 * (app/essential-providers.tsx) — so the RTL-flip class of bug is now
 * structurally impossible, not just newly correct. There is nothing left to
 * assert about `style.left`/`style.right` (Radix positions via a computed
 * `transform`, not those properties). What's left worth verifying: the menu
 * still opens correctly and renders its content when `dir` is RTL.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'he',
    setLanguage: vi.fn(),
    dir: 'rtl',
  }),
}));

vi.mock('../../../contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ style: { accentHex: null } }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    profile: {
      id: 'test-user',
      username: 'TestUser',
      display_name: 'Test User',
      total_xp: 1000,
      avatar_emoji: '🧑',
      avatar_color: '#00CED1',
      avatar_image: null,
    },
    isSupabaseEnabled: true,
    loading: false,
    isAdmin: false,
    user: { id: 'test-user' },
  }),
}));

vi.mock('../../../lib/supabase', () => ({
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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

vi.mock('../../Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

vi.mock('../../LevelBadge', () => ({
  __esModule: true,
  default: () => <div data-testid="level-badge">Level</div>,
}));

vi.mock('../../XpProgressBar', () => ({
  getLevelFromXp: () => 10,
}));

vi.mock('../../engagement/CalendarRewardsModal', () => ({
  CalendarRewardsModal: () => null,
}));

vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: vi.fn(() => Promise.resolve({ ok: false })),
}));

describe('AuthButton Dropdown — RTL', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens and renders menu content when dir="rtl" (no manual position math left to break)', async () => {
    const user = userEvent.setup();
    const { default: AuthButton } = await import('../AuthButton');

    render(<AuthButton />);

    const menuButton = screen.getByRole('button', { name: /auth\.userMenu/i });
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });
});
