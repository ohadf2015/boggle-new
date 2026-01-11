/**
 * Tests for Avatar Grid UI in JoinRoomModal and CreateRoomModal
 *
 * Tests for the avatar selection UI including:
 * - Scrollable grid for many avatars
 * - Neo-brutalist styling (individual shadows, not grid shadow)
 * - Proper sizing for mobile touch targets
 * - Profile avatar selection for authenticated users
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinRoomModal from '../JoinRoomModal';
import CreateRoomModal from '../CreateRoomModal';
import type { ActiveRoom, Language } from '@/shared/types/game';

// Mock framer-motion - filter out motion-specific props
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, initial, animate, exit, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover, whileTap, initial, animate, exit, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.chooseAvatar': 'Choose Avatar',
        'profile.you': 'YOU',
        'multiplayerFlow.joinModal.title': 'Join Room',
        'multiplayerFlow.joinModal.yourName': 'Your Name',
        'multiplayerFlow.joinModal.joinButton': 'Join Game',
        'multiplayerFlow.createModal.title': 'Create Room',
        'multiplayerFlow.createModal.yourName': 'Your Name',
        'multiplayerFlow.createModal.createButton': 'Create Room',
        'joinView.players': 'players',
      };
      return translations[key] || key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

jest.mock('@/utils/profileStorage', () => ({
  getStoredUsername: jest.fn().mockReturnValue('TestPlayer'),
  getStoredAvatarId: jest.fn().mockReturnValue('broccoli-bob'),
  setStoredUsername: jest.fn(),
  setStoredAvatarId: jest.fn(),
}));

// Use real avatars to test scrolling with 17 avatars
jest.mock('@/utils/avatarConfig', () => {
  const mockAvatars = [
    { id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' },
    { id: 'drippy-drop', name: 'Drippy Drop', filename: 'drippy-drop.png' },
    { id: 'sunny-steve', name: 'Sunny Steve', filename: 'sunny-steve.png' },
    { id: 'cloudy-carl', name: 'Cloudy Carl', filename: 'cloudy-carl.png' },
    { id: 'octo-otto', name: 'Octo Otto', filename: 'octo-otto.png' },
    { id: 'pizza-pete', name: 'Pizza Pete', filename: 'pizza-pete.png' },
    { id: 'prickly-pat', name: 'Prickly Pat', filename: 'prickly-pat.png' },
    { id: 'melon-molly', name: 'Melon Molly', filename: 'melon-molly.png' },
    { id: 'avo-alex', name: 'Avo Alex', filename: 'avo-alex.png' },
    { id: 'frosty-frank', name: 'Frosty Frank', filename: 'frosty-frank.png' },
    { id: 'flaky-fred', name: 'Flaky Fred', filename: 'flaky-fred.png' },
    { id: 'eggy-ed', name: 'Eggy Ed', filename: 'eggy-ed.png' },
    { id: 'slimy-sam', name: 'Slimy Sam', filename: 'slimy-sam.png' },
    { id: 'starry-stella', name: 'Starry Stella', filename: 'starry-stella.png' },
    { id: 'shroom-shelly', name: 'Shroom Shelly', filename: 'shroom-shelly.png' },
    { id: 'donut-danny', name: 'Donut Danny', filename: 'donut-danny.png' },
    { id: 'jelly-jen', name: 'Jelly Jen', filename: 'jelly-jen.png' },
  ];

  return {
    AVATARS: mockAvatars,
    getAvatarPath: (avatar: { filename: string } | string) => {
      if (typeof avatar === 'string') return `/avatars/${avatar}`;
      return `/avatars/${avatar.filename}`;
    },
    getRandomAvatar: () => mockAvatars[0],
    getAvatarById: (id: string) => mockAvatars.find(a => a.id === id),
  };
});

jest.mock('@/lib/languageConfig', () => ({
  LANGUAGE_FLAGS: {
    en: '🇺🇸',
    he: '🇮🇱',
    sv: '🇸🇪',
    ja: '🇯🇵',
  },
}));

jest.mock('@/components/EmojiAvatarPicker', () => ({
  PROFILE_AVATAR_ID: '__profile_avatar__',
}));

jest.mock('@/components/join/LanguageSelector', () => ({
  LanguageSelector: ({ selectedLanguage, onLanguageChange }: { selectedLanguage: string; onLanguageChange: (lang: string) => void }) => (
    <select
      data-testid="language-selector"
      value={selectedLanguage}
      onChange={(e) => onLanguageChange(e.target.value)}
    >
      <option value="en">English</option>
      <option value="he">Hebrew</option>
    </select>
  ),
}));

jest.mock('@/utils/consts', () => ({
  sanitizeRoomName: (name: string) => name,
}));

describe('Avatar Grid UI', () => {
  const mockRoom: ActiveRoom = {
    gameCode: 'ABC123',
    roomName: 'Test Room',
    playerCount: 2,
    language: 'en',
    gameState: 'waiting',
    isRanked: false,
    createdAt: Date.now(),
  };

  describe('JoinRoomModal Avatar Grid', () => {
    const joinModalProps = {
      isOpen: true,
      onClose: jest.fn(),
      room: mockRoom,
      isJoining: false,
      onJoin: jest.fn(),
      isAuthenticated: false,
      displayName: null,
      profilePictureUrl: null,
      profileAvatarId: undefined,
    };

    it('should render avatar grid container with scrollable styling', () => {
      render(<JoinRoomModal {...joinModalProps} />);

      // Find the avatar grid container
      const avatarButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('img[alt]')
      );

      expect(avatarButtons.length).toBeGreaterThan(0);

      // Get the inner grid (parent of avatar buttons)
      const innerGrid = avatarButtons[0].parentElement;
      expect(innerGrid).toBeInTheDocument();
      expect(innerGrid?.className).toContain('grid');

      // Get the scrollable wrapper (parent of inner grid)
      const scrollableWrapper = innerGrid?.parentElement;
      expect(scrollableWrapper).toBeInTheDocument();

      // Should have max-height and overflow-y-auto for scrolling
      expect(scrollableWrapper?.className).toMatch(/max-h-|overflow/i);
    });

    it('should NOT have shadow-hard on the grid container', () => {
      render(<JoinRoomModal {...joinModalProps} />);

      const avatarButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('img[alt]')
      );

      const innerGrid = avatarButtons[0].parentElement;
      const scrollableWrapper = innerGrid?.parentElement;

      // Neither the grid nor wrapper should have shadow-hard (it looks bad)
      expect(innerGrid?.className).not.toContain('shadow-hard');
      expect(scrollableWrapper?.className).not.toContain('shadow-hard');
    });

    it('should have all 17 avatars rendered', () => {
      render(<JoinRoomModal {...joinModalProps} />);

      const avatarButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('img[alt]')
      );

      // Should have 17 avatars
      expect(avatarButtons.length).toBe(17);
    });

    it('should allow selecting any avatar and joining with it', async () => {
      const user = userEvent.setup();
      const onJoin = jest.fn();
      render(<JoinRoomModal {...joinModalProps} onJoin={onJoin} />);

      // Find and click the last avatar (Jelly Jen)
      const jellyJenAvatar = screen.getByAltText('Jelly Jen').closest('button');
      expect(jellyJenAvatar).toBeInTheDocument();

      await user.click(jellyJenAvatar!);

      // Click join
      const joinButton = screen.getByRole('button', { name: /join game/i });
      await user.click(joinButton);

      // Should have selected jelly-jen for the avatar
      // This verifies that clicking an avatar updates the state correctly
      expect(onJoin).toHaveBeenCalledWith(
        expect.any(String), // Username - can be from storage or random avatar name
        'jelly-jen'
      );
    });

    it('should show profile avatar option when user has profile picture', () => {
      render(
        <JoinRoomModal
          {...joinModalProps}
          isAuthenticated={true}
          displayName="TestUser"
          profilePictureUrl="https://example.com/avatar.jpg"
        />
      );

      // Should show the "YOU" label for profile avatar
      expect(screen.getByText('YOU')).toBeInTheDocument();
    });

    it('should select profile avatar by default for authenticated users with picture', () => {
      render(
        <JoinRoomModal
          {...joinModalProps}
          isAuthenticated={true}
          displayName="TestUser"
          profilePictureUrl="https://example.com/avatar.jpg"
        />
      );

      // The profile avatar button should have the selected styling (ring)
      const profileAvatarButton = screen.getByText('YOU').closest('button');
      expect(profileAvatarButton?.className).toContain('ring-neo-cyan');
    });
  });

  describe('CreateRoomModal Avatar Grid', () => {
    const createModalProps = {
      isOpen: true,
      onClose: jest.fn(),
      isCreating: false,
      onCreate: jest.fn(),
      defaultLanguage: 'en' as Language,
      isAuthenticated: false,
      displayName: null,
      profilePictureUrl: null,
      profileAvatarId: undefined,
    };

    it('should render avatar grid container with scrollable styling', () => {
      render(<CreateRoomModal {...createModalProps} />);

      const avatarButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('img[alt]')
      );

      expect(avatarButtons.length).toBeGreaterThan(0);

      // Get the inner grid (parent of avatar buttons)
      const innerGrid = avatarButtons[0].parentElement;
      expect(innerGrid).toBeInTheDocument();
      expect(innerGrid?.className).toContain('grid');

      // Get the scrollable wrapper (parent of inner grid)
      const scrollableWrapper = innerGrid?.parentElement;
      expect(scrollableWrapper).toBeInTheDocument();

      // Should have max-height and overflow for scrolling
      expect(scrollableWrapper?.className).toMatch(/max-h-|overflow/i);
    });

    it('should NOT have shadow-hard on the grid container', () => {
      render(<CreateRoomModal {...createModalProps} />);

      const avatarButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('img[alt]')
      );

      const innerGrid = avatarButtons[0].parentElement;
      const scrollableWrapper = innerGrid?.parentElement;

      // Neither the grid nor wrapper should have shadow-hard
      expect(innerGrid?.className).not.toContain('shadow-hard');
      expect(scrollableWrapper?.className).not.toContain('shadow-hard');
    });

    it('should have proper border styling on grid container', () => {
      render(<CreateRoomModal {...createModalProps} />);

      const avatarButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('img[alt]')
      );

      const innerGrid = avatarButtons[0].parentElement;
      const scrollableWrapper = innerGrid?.parentElement;

      // Wrapper should have border for neo-brutalist look
      expect(scrollableWrapper?.className).toMatch(/border|rounded/);
    });

    it('should allow avatar selection and create room with it', async () => {
      const user = userEvent.setup();
      const onCreate = jest.fn();
      render(<CreateRoomModal {...createModalProps} onCreate={onCreate} />);

      // Click on Pizza Pete avatar
      const pizzaAvatar = screen.getByAltText('Pizza Pete').closest('button');
      expect(pizzaAvatar).toBeInTheDocument();

      await user.click(pizzaAvatar!);

      // Click create
      const createButton = screen.getByRole('button', { name: /create room/i });
      await user.click(createButton);

      // Should have selected pizza-pete for the avatar
      // This verifies that clicking an avatar updates the state correctly
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarId: 'pizza-pete',
        })
      );
    });
  });
});
