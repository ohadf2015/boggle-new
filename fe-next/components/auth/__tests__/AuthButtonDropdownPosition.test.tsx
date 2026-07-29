/**
 * AuthButton Dropdown Position Tests
 *
 * Tests for RTL dropdown positioning in the AuthButton component.
 * Issue: In RTL mode, dropdown appears on wrong side of screen.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the contexts and hooks before importing the component
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

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
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

// Mock createPortal to render in the document (allows us to inspect style)
vi.mock('react-dom', () => {
  const originalModule = vi.importActual('react-dom');
  return {
    ...originalModule,
    createPortal: (node: React.ReactNode) => node, // Render inline instead of portal
  };
});

// Mock getBoundingClientRect
const mockButtonRect = {
  left: 50,
  right: 150,
  top: 10,
  bottom: 50,
  width: 100,
  height: 40,
  x: 50,
  y: 10,
  toJSON: () => ({}),
};

describe('AuthButton Dropdown Position', () => {
  beforeEach(() => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    // Mock getBoundingClientRect for button
    Element.prototype.getBoundingClientRect = vi.fn(() => mockButtonRect);

    // Mock fetch for calendar rewards
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ canClaimToday: false }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('positions dropdown under the button in RTL mode (not on opposite side)', async () => {
    // Import dynamically to ensure mocks are applied
    const { default: AuthButton } = await import('../AuthButton');

    render(<AuthButton />);

    // Click the user menu button to open dropdown (aria-label is the translation key)
    const menuButton = screen.getByRole('button', { name: /auth\.userMenu/i });
    fireEvent.click(menuButton);

    // Wait for the dropdown menu to appear
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const dropdownMenu = screen.getByRole('menu');
    const style = dropdownMenu.getAttribute('style');

    // In RTL mode with button at left: 50, the dropdown should be positioned
    // with left: 50 (aligned to button's left edge), NOT at window.innerWidth - rect.right = 850
    // which would place it on the opposite side of the screen
    //
    // Bug: Current code calculates: left = window.innerWidth - rect.right = 1000 - 150 = 850
    // Fix: Should be: left = rect.left = 50
    expect(style).toContain('left: 50px');
    expect(style).not.toContain('left: 850px');
  });
});
