/**
 * Tests for CreateRoomModal component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateRoomModal from '../CreateRoomModal';
import type { Language } from '@/shared/types/game';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import * as profileStorage from '@/utils/profileStorage';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string; noDescription?: boolean }) =>
    <div className={className} data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className} data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <h2 className={className} data-testid="dialog-title">{children}</h2>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'multiplayerFlow.createModal.title': 'Create Room',
        'multiplayerFlow.createModal.yourName': 'Your Name',
        'multiplayerFlow.createModal.namePlaceholder': 'Your name',
        'multiplayerFlow.createModal.roomNameLabel': 'Room Name',
        'multiplayerFlow.createModal.optional': 'optional',
        'multiplayerFlow.createModal.creating': 'Creating...',
        'multiplayerFlow.createModal.createButton': 'Create Room',
        'joinView.selectLanguage': 'Language',
        'joinView.english': 'English',
        'joinView.hebrew': 'Hebrew',
        'joinView.swedish': 'Swedish',
        'joinView.japanese': 'Japanese',
        'joinView.spanish': 'Spanish',
      };
      return translations[key] || key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: vi.fn().mockReturnValue('TestUser'),
  getStoredCustomAvatar: vi.fn().mockReturnValue(null),
  getOrCreateStoredCustomAvatar: vi.fn().mockReturnValue({ gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'short', hairColor: '#2C1B18', eyes: 'normal', eyebrows: 'none', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#4ECDC4', shirtColor: '#4A90D9' }),
  setStoredUsername: vi.fn(),
  setStoredCustomAvatar: vi.fn(),
}));

vi.mock('@/utils/consts', () => ({
  sanitizeRoomName: vi.fn((name: string) => name),
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

vi.mock('@/utils/validation', () => ({
  validateUsername: (username: string) => {
    if (!username || username.trim().length < 2) {
      return { isValid: false, error: 'validation.usernameRequired' };
    }
    return { isValid: true, error: null };
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/components/multiplayer/AvatarSelector', () => ({
  AvatarSelector: ({ onAvatarChange }: {
    selectedAvatar?: CustomAvatarConfig | null;
    onAvatarChange: (config: CustomAvatarConfig) => void;
    compact?: boolean;
    onBuilderOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="avatar-selector">
      <button onClick={() => onAvatarChange({ ...DEFAULT_AVATAR_CONFIG, eyes: 'star' })}>
        Change Avatar
      </button>
    </div>
  ),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  // Cache components to prevent unmount/remount on re-render
  const cache: Record<string, React.FC<Record<string, unknown>>> = {};

  const createMotionComponent = (tag: string) => {
    if (!cache[tag]) {
      const Comp = React.forwardRef<HTMLElement, Record<string, unknown>>(
        (props, ref) => {
          const { initial, animate, exit, transition, variants, whileHover, whileTap, whileFocus, whileDrag, layout, layoutId, ...htmlProps } = props;
          return React.createElement(tag, { ...htmlProps, ref });
        }
      );
      Comp.displayName = `Motion.${tag}`;
      cache[tag] = Comp as unknown as React.FC<Record<string, unknown>>;
    }
    return cache[tag];
  };

  return {
    AdaptiveMotion: new Proxy({}, {
      get: (_target, prop: string) => createMotionComponent(prop),
    }),
    AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode; mode?: string }) => <>{children}</>,
  };
});

describe('CreateRoomModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    isCreating: false,
    onCreate: vi.fn(),
    defaultLanguage: 'en' as Language,
    isAuthenticated: false,
    displayName: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render AvatarSelector', () => {
    render(<CreateRoomModal {...defaultProps} />);
    expect(screen.getByTestId('avatar-selector')).toBeInTheDocument();
  });

  it('should render always-visible name input for guests', () => {
    render(<CreateRoomModal {...defaultProps} />);
    const nameInput = screen.getByDisplayValue('TestUser');
    expect(nameInput.tagName).toBe('INPUT');
  });

  it('should show authenticated user name in input (pre-filled with displayName)', () => {
    render(<CreateRoomModal {...defaultProps} isAuthenticated={true} displayName="AuthUser" />);
    expect(screen.getByDisplayValue('AuthUser')).toBeInTheDocument();
  });

  it('should show validation error on submit with empty name', async () => {
    const user = userEvent.setup();
    const mockOnCreate = vi.fn();
    (profileStorage.getStoredUsername as ReturnType<typeof vi.fn>).mockReturnValueOnce('');
    render(<CreateRoomModal {...defaultProps} onCreate={mockOnCreate} />);

    const createButton = screen.getByRole('button', { name: /create room/i });
    await user.click(createButton);

    expect(mockOnCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render room name input with optional label', () => {
    render(<CreateRoomModal {...defaultProps} />);
    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('should call onCreate with correct config', async () => {
    const user = userEvent.setup();
    const mockOnCreate = vi.fn();

    render(<CreateRoomModal {...defaultProps} onCreate={mockOnCreate} />);

    // Wait for useEffect to populate username from storage
    await waitFor(() => {
      expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create room/i });
    await user.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        hostUsername: 'TestUser',
        language: 'en',
      })
    );
  });

  it('should show creating state', () => {
    render(<CreateRoomModal {...defaultProps} isCreating={true} />);
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });

  it('should render language flag pills with default selected', () => {
    render(<CreateRoomModal {...defaultProps} defaultLanguage="he" />);
    // Hebrew flag pill should exist
    const hebrewButton = screen.getByText('Hebrew');
    expect(hebrewButton).toBeInTheDocument();
    // All 5 language pills should render
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Swedish')).toBeInTheDocument();
  });

  it('should switch language when clicking a flag pill', async () => {
    const user = userEvent.setup();
    const mockOnCreate = vi.fn();
    render(<CreateRoomModal {...defaultProps} onCreate={mockOnCreate} />);

    // Wait for useEffect to populate state
    await waitFor(() => {
      expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument();
    });

    // Click Hebrew language pill
    await user.click(screen.getByText('Hebrew'));

    // Submit and verify language changed
    const createButton = screen.getByRole('button', { name: /create room/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'he' })
      );
    });
  });

  it('should render character counter for name input', () => {
    render(<CreateRoomModal {...defaultProps} />);
    // TestUser is 8 chars
    expect(screen.getByText('8/20')).toBeInTheDocument();
  });
});
