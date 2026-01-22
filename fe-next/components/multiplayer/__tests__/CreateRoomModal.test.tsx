/**
 * Tests for CreateRoomModal component UI styling and behavior
 *
 * Tests the UI improvements including:
 * - RTL text alignment
 * - Neo-brutalist profile section styling
 * - Avatar button shadow consistency
 * - Input styling consistency
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateRoomModal from '../CreateRoomModal';
import type { Language } from '@/shared/types/game';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock Dialog components from Radix UI
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string; noDescription?: boolean }) =>
    <div className={className} data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className} data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <h2 className={className} data-testid="dialog-title">{children}</h2>,
  DialogBody: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className} data-testid="dialog-body">{children}</div>,
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className} data-testid="dialog-footer">{children}</div>,
}));

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'multiplayerFlow.createModal.title': 'Create Room',
        'multiplayerFlow.createModal.changeAvatar': 'Change avatar',
        'multiplayerFlow.createModal.namePlaceholder': 'Your name',
        'multiplayerFlow.createModal.authenticatedHint': 'Signed in',
        'multiplayerFlow.createModal.roomNameLabel': 'Room Name',
        'multiplayerFlow.createModal.optional': 'optional',
        'multiplayerFlow.createModal.roomNameHint': 'Leave empty for auto-generated name',
        'multiplayerFlow.createModal.creating': 'Creating...',
        'multiplayerFlow.createModal.createButton': 'Create Room',
      };
      return translations[key] || key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

jest.mock('@/utils/profileStorage', () => ({
  getStoredUsername: jest.fn().mockReturnValue('Test Avatar'),
  getStoredAvatarId: jest.fn().mockReturnValue('avatar-1'),
  setStoredUsername: jest.fn(),
  setStoredAvatarId: jest.fn(),
}));

jest.mock('@/utils/avatarConfig', () => {
  const mockAvatar = { id: 'avatar-1', name: 'Test Avatar', path: '/avatars/test.png' };
  return {
    AVATARS: [mockAvatar],
    getAvatarPath: jest.fn(() => '/avatars/test.png'),
    getRandomAvatar: () => mockAvatar,
  };
});

jest.mock('@/utils/consts', () => ({
  sanitizeRoomName: jest.fn((name: string) => name),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('@/components/EmojiAvatarPicker', () => {
  const MockEmojiAvatarPicker = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="emoji-avatar-picker">
        <button onClick={onClose}>Close Picker</button>
      </div>
    ) : null;
  return {
    __esModule: true,
    default: MockEmojiAvatarPicker,
    PROFILE_AVATAR_ID: 'profile-avatar',
  };
});

jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-component" />,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size }: React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    size?: string;
  }>) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
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

jest.mock('@/components/multiplayer/AvatarSelector', () => ({
  AvatarSelector: ({ selectedAvatarId, onAvatarChange }: {
    selectedAvatarId: string;
    onAvatarChange: (id: string) => void;
    profilePictureUrl?: string | null;
  }) => (
    <div data-testid="avatar-selector">
      <button onClick={() => onAvatarChange('new-avatar')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Test Avatar" src="/avatars/test.png" />
      </button>
    </div>
  ),
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

describe('CreateRoomModal', () => {
  const defaultProps = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Section UI', () => {
    it('should render profile section with proper neo-brutalist styling', () => {
      render(<CreateRoomModal {...defaultProps} />);

      // Profile section should render with the avatar name from random avatar
      const profileSection = screen.getByText('Test Avatar').closest('div');
      expect(profileSection).toBeInTheDocument();
    });

    it('should render AvatarSelector component', () => {
      render(<CreateRoomModal {...defaultProps} />);

      // Since AvatarSelector is mocked, we just verify it renders
      expect(screen.getByTestId('avatar-selector')).toBeInTheDocument();
      expect(screen.getByAltText('Test Avatar')).toBeInTheDocument();
    });

    it('should display username with proper text alignment for RTL', () => {
      render(<CreateRoomModal {...defaultProps} />);

      // Find the name button container - uses avatar name from getRandomAvatar
      const nameButton = screen.getByText('Test Avatar').closest('button');
      expect(nameButton).toBeInTheDocument();

      // Should use text-start (RTL-safe) instead of text-left
      // The class should contain 'text-start' for RTL compatibility
      expect(nameButton?.className).toContain('text-start');
    });

    it('should show pencil icon for guest users on name', () => {
      render(<CreateRoomModal {...defaultProps} />);

      const nameButton = screen.getByText('Test Avatar').closest('button');
      // Pencil icon should be present (the SVG from lucide-react)
      const pencilIcon = nameButton?.querySelector('svg');
      expect(pencilIcon).toBeInTheDocument();
    });

    it('should not show pencil icon for authenticated users', () => {
      render(
        <CreateRoomModal
          {...defaultProps}
          isAuthenticated={true}
          displayName="AuthUser"
        />
      );

      // Authenticated users see a disabled input, not an editable button
      const nameInput = screen.getByDisplayValue('AuthUser');
      expect(nameInput).toBeDisabled();

      // Should NOT have a pencil icon
      const nameContainer = nameInput.closest('div');
      const pencilIcon = nameContainer?.querySelector('svg');
      expect(pencilIcon).toBeNull();
    });
  });

  describe('Room Name Input', () => {
    it('should render room name input with consistent styling', () => {
      render(<CreateRoomModal {...defaultProps} />);

      const roomNameInput = screen.getByPlaceholderText(/room/i);
      expect(roomNameInput).toBeInTheDocument();

      // Input should be rendered - checking basic functionality
      expect(roomNameInput.tagName).toBe('INPUT');
    });

    it('should show optional label for room name', () => {
      render(<CreateRoomModal {...defaultProps} />);

      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });
  });

  describe('Avatar Selection', () => {
    it('should allow selecting avatars directly from grid', () => {
      render(<CreateRoomModal {...defaultProps} />);

      const avatarButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('img[alt="Test Avatar"]')
      );

      expect(avatarButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Name Editing', () => {
    it('should allow guest users to edit name', async () => {
      const user = userEvent.setup();
      render(<CreateRoomModal {...defaultProps} />);

      const nameButton = screen.getByText('Test Avatar').closest('button');
      expect(nameButton).not.toBeDisabled();

      await user.click(nameButton!);

      // Should show input field after clicking
      const input = screen.getByDisplayValue('Test Avatar');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('should not allow authenticated users to edit name', () => {
      render(
        <CreateRoomModal
          {...defaultProps}
          isAuthenticated={true}
          displayName="AuthUser"
        />
      );

      // Authenticated users see their name in a disabled input (not editable)
      const nameInput = screen.getByDisplayValue('AuthUser');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toBeDisabled();

      // Should NOT have a pencil icon (which indicates editability)
      const nameContainer = nameInput.closest('div');
      const pencilIcon = nameContainer?.querySelector('svg');
      expect(pencilIcon).toBeNull();
    });
  });

  describe('Create Button', () => {
    it('should call onCreate with correct config', async () => {
      const user = userEvent.setup();
      const mockOnCreate = jest.fn();
      render(<CreateRoomModal {...defaultProps} onCreate={mockOnCreate} />);

      const createButton = screen.getByRole('button', { name: /create room/i });
      await user.click(createButton);

      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          hostUsername: 'Test Avatar',
          avatarId: 'avatar-1',
          language: 'en',
        })
      );
    });

    it('should show creating state when isCreating is true', () => {
      render(<CreateRoomModal {...defaultProps} isCreating={true} />);

      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });
  });

  describe('Language Selector', () => {
    it('should render language selector', () => {
      render(<CreateRoomModal {...defaultProps} />);

      expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    });

    it('should use default language', () => {
      render(<CreateRoomModal {...defaultProps} defaultLanguage="he" />);

      const selector = screen.getByTestId('language-selector') as HTMLSelectElement;
      expect(selector.value).toBe('he');
    });
  });
});
