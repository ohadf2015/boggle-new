/**
 * Tests for CreateRoomModal component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateRoomModal from '../CreateRoomModal';
import type { Language } from '@/shared/types/game';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
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

jest.mock('@/contexts/LanguageContext', () => ({
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
      };
      return translations[key] || key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

jest.mock('@/utils/profileStorage', () => ({
  getStoredUsername: jest.fn().mockReturnValue('TestUser'),
  getStoredCustomAvatar: jest.fn().mockReturnValue(null),
  setStoredUsername: jest.fn(),
  setStoredCustomAvatar: jest.fn(),
}));

jest.mock('@/utils/consts', () => ({
  sanitizeRoomName: jest.fn((name: string) => name),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('@/components/multiplayer/AvatarSelector', () => ({
  AvatarSelector: ({ selectedAvatar, onAvatarChange }: {
    selectedAvatar: CustomAvatarConfig | null;
    onAvatarChange: (config: CustomAvatarConfig) => void;
  }) => (
    <div data-testid="avatar-selector">
      <button onClick={() => onAvatarChange({ ...DEFAULT_AVATAR_CONFIG, eyes: 'star' })}>
        Change Avatar
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

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: React.PropsWithChildren<{
    onClick?: () => void; disabled?: boolean; className?: string; variant?: string; size?: string;
  }>) => (
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
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

describe('CreateRoomModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    isCreating: false,
    onCreate: jest.fn(),
    defaultLanguage: 'en' as Language,
    isAuthenticated: false,
    displayName: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render AvatarSelector', () => {
    render(<CreateRoomModal {...defaultProps} />);
    expect(screen.getByTestId('avatar-selector')).toBeInTheDocument();
  });

  it('should render username with edit button for guests', () => {
    render(<CreateRoomModal {...defaultProps} />);
    const nameButton = screen.getByText('TestUser').closest('button');
    expect(nameButton).toBeInTheDocument();
    expect(nameButton?.className).toContain('text-start');
  });

  it('should show disabled input for authenticated users', () => {
    render(<CreateRoomModal {...defaultProps} isAuthenticated={true} displayName="AuthUser" />);
    const nameInput = screen.getByDisplayValue('AuthUser');
    expect(nameInput).toBeDisabled();
  });

  it('should allow editing name for guests', async () => {
    const user = userEvent.setup();
    render(<CreateRoomModal {...defaultProps} />);

    await user.click(screen.getByText('TestUser').closest('button')!);
    const input = screen.getByDisplayValue('TestUser');
    expect(input.tagName).toBe('INPUT');
  });

  it('should render room name input with optional label', () => {
    render(<CreateRoomModal {...defaultProps} />);
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('should call onCreate with correct config', async () => {
    const user = userEvent.setup();
    const mockOnCreate = jest.fn();
    render(<CreateRoomModal {...defaultProps} onCreate={mockOnCreate} />);

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

  it('should render language selector with default language', () => {
    render(<CreateRoomModal {...defaultProps} defaultLanguage="he" />);
    const selector = screen.getByTestId('language-selector') as HTMLSelectElement;
    expect(selector.value).toBe('he');
  });
});
