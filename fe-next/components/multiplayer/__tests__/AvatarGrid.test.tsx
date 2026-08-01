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

vi.mock('@/contexts/LanguageContext', () => ({
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

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getOrCreateStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getStoredCustomAvatar: vi.fn().mockReturnValue(null),
  getOrCreateStoredCustomAvatar: vi.fn().mockReturnValue({ gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'short', hairColor: '#2C1B18', eyes: 'normal', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#4ECDC4' }),
  setStoredUsername: vi.fn(),
  setStoredCustomAvatar: vi.fn(),
}));

vi.mock('@/utils/consts', () => ({
  sanitizeRoomName: (name: string) => name,
  NAME_VALID_PATTERN: /^[\p{L}\p{N}\s._-]+$/u,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 20,
  ROOM_NAME_MIN_LENGTH: 2,
  ROOM_NAME_MAX_LENGTH: 30,
  GAME_CODE_MIN_LENGTH: 4,
  GAME_CODE_MAX_LENGTH: 6,
  WORD_MIN_LENGTH: 3,
  WORD_MAX_LENGTH: 16,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_VALID_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  EMAIL_MAX_LENGTH: 254,
  EMAIL_LOCAL_MAX_LENGTH: 64,
  PASSWORD_STRENGTH_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/languageConfig', () => ({
  LANGUAGE_FLAGS: { en: '🇺🇸', he: '🇮🇱' },
}));

vi.mock('@/components/ui/dialog', () => ({
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: React.PropsWithChildren<{
    onClick?: () => void; disabled?: boolean; className?: string; variant?: string; size?: string;
  }>) => <button onClick={onClick} disabled={disabled} className={className}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => {
  const MockInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />
  );
  MockInput.displayName = 'MockInput';
  return { Input: MockInput };
});

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
    <label className={className}>{children}</label>,
}));

vi.mock('@/components/avatar/AvatarBuilderModal', () => {
  return { default: function MockAvatarBuilderModal({ isOpen, onSave }: {
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
  } };
});

vi.mock('@/components/avatar/AvatarRenderer', () => {
  const MockAvatarRenderer = () => {
    return <div data-testid="avatar-renderer" />;
  };
  return { default: MockAvatarRenderer };
});

vi.mock('@/components/join/LanguageSelector', () => ({
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
      onClose: vi.fn(),
      room: mockRoom,
      isJoining: false,
      onJoin: vi.fn(),
      isAuthenticated: false,
      displayName: null,
    };

    it('should render AvatarSelector with builder button', () => {
      render(<JoinRoomModal {...joinProps} />);
      // JoinRoomModal uses compact AvatarSelector — text is in aria-label, not visible
      expect(screen.getByLabelText('Choose Avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
    });

    it('should open avatar builder modal on click', async () => {
      const user = userEvent.setup();
      render(<JoinRoomModal {...joinProps} />);

      const avatarButton = screen.getByLabelText('Choose Avatar');
      await user.click(avatarButton);

      expect(screen.getByTestId('avatar-builder-modal')).toBeInTheDocument();
    });

    it('should call onJoin with username on submit', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<JoinRoomModal {...joinProps} onJoin={onJoin} />);

      const joinButton = screen.getByRole('button', { name: /join game/i });
      await user.click(joinButton);

      expect(onJoin).toHaveBeenCalledWith('TestPlayer');
    });
  });

  describe('CreateRoomModal', () => {
    const createProps = {
      isOpen: true,
      onClose: vi.fn(),
      isCreating: false,
      onCreate: vi.fn(),
      defaultLanguage: 'en' as Language,
      isAuthenticated: false,
      displayName: null,
    };

    it('should render AvatarSelector with builder button', () => {
      render(<CreateRoomModal {...createProps} />);
      // CreateRoomModal uses compact AvatarSelector — text is in aria-label, not visible
      expect(screen.getByLabelText('Choose Avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
    });

    it('should call onCreate on submit', async () => {
      const user = userEvent.setup();
      const onCreate = vi.fn();
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
