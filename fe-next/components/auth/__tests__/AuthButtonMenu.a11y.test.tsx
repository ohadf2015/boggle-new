/**
 * AuthButton user menu — accessibility behavior tests.
 *
 * The menu was hand-rolled (manual getBoundingClientRect positioning,
 * mousedown-based click-outside, no Escape handler, no arrow-key navigation).
 * Migrated onto @radix-ui/react-dropdown-menu, which provides all of this
 * natively. These tests exercise the REAL Radix primitive (not mocked) to
 * verify the behavior actually works, not just that markup renders.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
    dir: 'ltr',
  }),
}));

vi.mock('../../../contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ style: { accentHex: null } }),
}));

vi.mock('../../../lib/supabase', () => ({ signOut: vi.fn() }));

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

describe('AuthButton user menu — a11y', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  async function openMenu() {
    const user = userEvent.setup();
    const { default: AuthButton } = await import('../AuthButton');
    render(<AuthButton />);
    const trigger = screen.getByRole('button', { name: 'auth.userMenu' });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    return { user, trigger };
  }

  it('opens the menu on trigger click with menuitem entries', async () => {
    await openMenu();
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user, trigger } = await openMenu();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('moves focus between items with ArrowDown (roving keyboard nav)', async () => {
    const { user } = await openMenu();
    const items = screen.getAllByRole('menuitem');
    await user.keyboard('{ArrowDown}');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
  });

  it('closes when clicking outside the menu', async () => {
    await openMenu();
    // Radix sets pointer-events:none on <body> while the portal is open (its own
    // outside-click guard) — userEvent.click() refuses to click through that, so
    // this uses the lower-level fireEvent the same way Radix's own dismiss logic does.
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
