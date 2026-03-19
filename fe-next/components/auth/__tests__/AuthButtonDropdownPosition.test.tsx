/**
 * AuthButton Dropdown Position Tests
 *
 * Tests for RTL dropdown positioning in the AuthButton component.
 * Issue: In RTL mode, dropdown appears on wrong side of screen.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the contexts and hooks before importing the component
jest.mock('../../../utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: jest.fn() }),
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'he',
    setLanguage: jest.fn(),
    dir: 'rtl',
  }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
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

jest.mock('../../../lib/supabase', () => ({
  signOut: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCrazyGamesAuth', () => ({
  useCrazyGamesAuth: () => ({
    isCrazyGames: false,
    user: null,
    isLoggedIn: false,
    isLoggingIn: false,
    login: jest.fn(),
    isAccountAvailable: false,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../../Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

jest.mock('../../LevelBadge', () => ({
  __esModule: true,
  default: () => <div data-testid="level-badge">Level</div>,
}));

jest.mock('../../XpProgressBar', () => ({
  getLevelFromXp: () => 10,
}));

jest.mock('../../engagement/CalendarRewardsModal', () => ({
  CalendarRewardsModal: () => null,
}));

// Mock createPortal to render in the document (allows us to inspect style)
jest.mock('react-dom', () => {
  const originalModule = jest.requireActual('react-dom');
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
    Element.prototype.getBoundingClientRect = jest.fn(() => mockButtonRect);

    // Mock fetch for calendar rewards
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ canClaimToday: false }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
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
