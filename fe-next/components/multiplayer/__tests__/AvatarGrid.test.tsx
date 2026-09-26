/**
 * Avatar builder integration on the MP entry.
 *
 * MP rebuild (DESIGN §a/§b.2): identity is part of the entry, not a modal —
 * the avatar builder opens from the entry identity row (it used to open from
 * inside the create/join modals). The create/join sheets submit with that same
 * identity. Verifies that:
 * - the identity avatar opens the builder, and a saved avatar is stored
 * - JoinRoomModal / CreateRoomModal (now the entry sheets) submit with the name
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinRoomModal from '../JoinRoomModal';
import CreateRoomModal from '../CreateRoomModal';
import { EntryIdentity } from '../entry/EntryIdentity';
import { setStoredCustomAvatar } from '@/utils/profileStorage';
import type { ActiveRoom, Language } from '@/shared/types/game';
import { type CustomAvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'mpUi.entry.editAvatar': 'Edit avatar',
        'mpUi.entry.join': 'Join battle',
        'mpUi.entry.startBattle': 'Start battle',
      };
      return translations[key] || key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ loading: false, profile: null, updateProfile: vi.fn(() => Promise.resolve()) }),
}));

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getOrCreateStoredUsername: vi.fn().mockReturnValue('TestPlayer'),
  getStoredCustomAvatar: vi.fn().mockReturnValue(null),
  getOrCreateStoredCustomAvatar: vi.fn().mockReturnValue({ gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'short', hairColor: '#2C1B18', eyes: 'normal', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#4ECDC4' }),
  setStoredUsername: vi.fn(),
  setStoredCustomAvatar: vi.fn(),
}));

vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => ({ isPremium: false }) }));

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

  describe('EntryIdentity', () => {
    it('renders the avatar with an edit affordance', () => {
      render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
      expect(screen.getByLabelText('Edit avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
    });

    it('opens the avatar builder on tap and stores what the player saves', async () => {
      const user = userEvent.setup();
      render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);

      await user.click(screen.getByLabelText('Edit avatar'));
      expect(await screen.findByTestId('avatar-builder-modal')).toBeInTheDocument();

      await user.click(screen.getByText('Save Avatar'));
      expect(setStoredCustomAvatar).toHaveBeenCalledWith(expect.objectContaining({ eyes: 'star' }));
    });
  });

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

    it('shows the identity it will join with', () => {
      render(<JoinRoomModal {...joinProps} />);
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
    });

    it('should call onJoin with username on submit', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<JoinRoomModal {...joinProps} onJoin={onJoin} />);

      const joinButton = screen.getByRole('button', { name: /join battle/i });
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

    it('shows the identity it will host with', () => {
      render(<CreateRoomModal {...createProps} />);
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
    });

    it('should call onCreate on submit', async () => {
      const user = userEvent.setup();
      const onCreate = vi.fn();
      render(<CreateRoomModal {...createProps} onCreate={onCreate} />);

      const createButton = screen.getByRole('button', { name: /start battle/i });
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
