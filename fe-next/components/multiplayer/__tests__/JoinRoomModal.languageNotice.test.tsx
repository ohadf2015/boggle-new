/**
 * @jest-environment jsdom
 *
 * Cross-language room visibility: when a user's interface language differs
 * from the room's game language, the JoinRoomModal surfaces a neutral notice
 * so the player chooses consciously instead of joining and discovering at
 * word-submit time that the dictionary is foreign.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import JoinRoomModal from '../JoinRoomModal';
import type { ActiveRoom } from '@/shared/types/game';

const languageState = { language: 'en' as string };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      if (!vars) return key;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v)),
        key,
      );
    },
    dir: 'ltr',
    language: languageState.language,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ updateProfile: vi.fn() }),
}));

vi.mock('@/components/multiplayer/AvatarSelector', () => ({
  AvatarSelector: () => <div data-testid="avatar-selector" />,
}));

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => 'tester',
  getOrCreateStoredCustomAvatar: () => ({ seed: 's', parts: {} }),
  setStoredUsername: vi.fn(),
  setStoredCustomAvatar: vi.fn(),
}));

const baseRoom: ActiveRoom = {
  gameCode: 'ABC123',
  roomName: 'Test Room',
  language: 'he',
  playerCount: 1,
  maxPlayers: 8,
  gameState: 'waiting',
  isRanked: false,
  createdAt: Date.now(),
  gameMode: 'classic',
  playerAvatars: [],
};

describe('JoinRoomModal — cross-language notice', () => {
  beforeEach(() => {
    languageState.language = 'en';
  });

  it('shows the language-mismatch notice when room.language differs from user language', () => {
    render(
      <JoinRoomModal
        isOpen
        onClose={vi.fn()}
        room={baseRoom}
        isJoining={false}
        onJoin={vi.fn()}
        isAuthenticated={false}
        displayName={null}
      />,
    );

    expect(screen.getByTestId('language-mismatch-notice')).toBeInTheDocument();
  });

  it('hides the notice when room.language matches user language', () => {
    languageState.language = 'he';
    render(
      <JoinRoomModal
        isOpen
        onClose={vi.fn()}
        room={baseRoom}
        isJoining={false}
        onJoin={vi.fn()}
        isAuthenticated={false}
        displayName={null}
      />,
    );

    expect(screen.queryByTestId('language-mismatch-notice')).not.toBeInTheDocument();
  });
});
