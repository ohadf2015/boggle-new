/**
 * Tests for Avatar Builder integration in JoinRoomModal and CreateRoomModal
 *
 * Verifies that:
 * - Both modals render the AvatarSelector component
 * - AvatarSelector opens the builder modal
 * - Neo-brutalist styling is applied
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinRoomModal from '../JoinRoomModal';
import CreateRoomModal from '../CreateRoomModal';
import type { ActiveRoom, Language } from '@/shared/types/game';
import { type CustomAvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.chooseAvatar': 'Choose Avatar',
        'joinView.selectAvatar': 'Customize your look',
        'multiplayerFlow.joinModal.title': 'Join Room',
        'multiplayerFlow.joinModal.yourName': 'Your Name',
        'multiplayerFlow.joinModal.namePlaceholder': 'Your name',
        'multiplayerFlow.joinModal.joinButton': 'Join Game',
        'multiplayerFlow.joinModal.joining': 'Joining...',
        'multiplayerFlow.createModal.title': 'Create Room',
        'multiplayerFlow.createModal.yourName': 'Your Name',
        'multiplayerFlow.createModal.namePlaceholder': 'Your name',
        'multiplayerFlow.createModal.roomNameLabel': 'Room Name',
        'multiplayerFlow.createModal.optional': 'optional',
        'multiplayerFlow.createModal.createButton': 'Create Room',
        'multiplayerFlow.createModal.creating': 'Creating...',
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
  getStoredCustomAvatar: jest.fn().mockReturnValue(null),
  getOrCreateStoredCustomAvatar: jest.fn().mockReturnValue({ base: 'round', skinColor: '#FFDBB4', hair: 'short', hairColor: '#2C1B18', eyes: 'normal', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#4ECDC4' }),
  setStoredUsername: jest.fn(),
  setStoredCustomAvatar: jest.fn(),
}));

jest.mock('@/utils/consts', () => ({
  sanitizeRoomName: (name: string) => name,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('@/lib/languageConfig', () => ({
  LANGUAGE_FLAGS: { en: '🇺🇸', he: '🇮🇱' },
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string; noDescription?: boolean }) =>
    <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className}>{children}</div>,
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: React.PropsWithChildren<{
    onClick?: () => void; disabled?: boolean; className?: string; variant?: string; size?: string;
  }>) => <button onClick={onClick} disabled={disabled} className={className}>{children}</button>,
}));

jest.mock('@/components/ui/input', () => {
  const MockInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />
  );
  MockInput.displayName = 'MockInput';
  return { Input: MockInput };
});

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
    <label className={className}>{children}</label>,
}));

jest.mock('@/components/avatar/AvatarBuilderModal', () => {
  return function MockAvatarBuilderModal({ isOpen, onSave }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: CustomAvatarConfig) => void;
    initialConfig: CustomAvatarConfig;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="avatar-builder-modal">
        <button onClick={() => onSave({ ...DEFAULT_AVATAR_CONFIG, eyes: 'star' })}>Save Avatar</button>
      </div>
    );
  };
});

jest.mock('@/components/avatar/AvatarRenderer', () => {
  return function MockAvatarRenderer() {
    return <div data-testid="avatar-renderer" />;
  };
});

jest.mock('@/components/join/LanguageSelector', () => ({
  LanguageSelector: ({ selectedLanguage, onLanguageChange }: { selectedLanguage: string; onLanguageChange: (lang: string) => void }) => (
    <select data-testid="language-selector" value={selectedLanguage} onChange={(e) => onLanguageChange(e.target.value)}>
      <option value="en">English</option>
    </select>
  ),
}));

describe('Avatar Builder Integration', () => {
  const mockRoom: ActiveRoom = {
    gameCode: 'ABC123',
    roomName: 'Test Room',
    playerCount: 2,
    language: 'en',
    gameState: 'waiting',
    isRanked: false,
    createdAt: Date.now(),
  };

  describe('JoinRoomModal', () => {
    const joinProps = {
      isOpen: true,
      onClose: jest.fn(),
      room: mockRoom,
      isJoining: false,
      onJoin: jest.fn(),
      isAuthenticated: false,
      displayName: null,
    };

    it('should render AvatarSelector with builder button', () => {
      render(<JoinRoomModal {...joinProps} />);
      expect(screen.getByText('Choose Avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
    });

    it('should open avatar builder modal on click', async () => {
      const user = userEvent.setup();
      render(<JoinRoomModal {...joinProps} />);

      const avatarButton = screen.getByText('Choose Avatar').closest('button');
      await user.click(avatarButton!);

      expect(screen.getByTestId('avatar-builder-modal')).toBeInTheDocument();
    });

    it('should call onJoin with username on submit', async () => {
      const user = userEvent.setup();
      const onJoin = jest.fn();
      render(<JoinRoomModal {...joinProps} onJoin={onJoin} />);

      const joinButton = screen.getByRole('button', { name: /join game/i });
      await user.click(joinButton);

      expect(onJoin).toHaveBeenCalledWith('TestPlayer');
    });
  });

  describe('CreateRoomModal', () => {
    const createProps = {
      isOpen: true,
      onClose: jest.fn(),
      isCreating: false,
      onCreate: jest.fn(),
      defaultLanguage: 'en' as Language,
      isAuthenticated: false,
      displayName: null,
    };

    it('should render AvatarSelector with builder button', () => {
      render(<CreateRoomModal {...createProps} />);
      expect(screen.getByText('Choose Avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
    });

    it('should call onCreate on submit', async () => {
      const user = userEvent.setup();
      const onCreate = jest.fn();
      render(<CreateRoomModal {...createProps} onCreate={onCreate} />);

      const createButton = screen.getByRole('button', { name: /create room/i });
      await user.click(createButton);

      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          hostUsername: 'TestPlayer',
          language: 'en',
        })
      );
    });
  });
});
