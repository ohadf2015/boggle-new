/**
 * Tests for AvatarSelector component (custom avatar builder)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarSelector } from '../AvatarSelector';
import { type CustomAvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.chooseAvatar': 'Choose Avatar',
        'joinView.selectAvatar': 'Customize your look',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/components/avatar/AvatarBuilderModal', () => {
  return { default: function MockAvatarBuilderModal({ isOpen, onClose, onSave, initialConfig }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: CustomAvatarConfig) => void;
    initialConfig: CustomAvatarConfig;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="avatar-builder-modal">
        <button onClick={() => onSave({ ...initialConfig, eyes: 'star' })}>Save Avatar</button>
        <button onClick={onClose}>Close Builder</button>
      </div>
    );
  } };
});

vi.mock('@/components/avatar/AvatarRenderer', () => {
  const MockAvatarRenderer = ({ config, size, mode }: { config: CustomAvatarConfig; size: number; mode?: string }) => {
    return <div data-testid="avatar-renderer" data-size={size} data-base={config.base} data-mode={mode ?? ''} />;
  };
  return { default: MockAvatarRenderer };
});

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

describe('AvatarSelector', () => {
  const mockOnAvatarChange = vi.fn();

  const defaultProps = {
    selectedAvatar: DEFAULT_AVATAR_CONFIG,
    onAvatarChange: mockOnAvatarChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with avatar preview', () => {
    render(<AvatarSelector {...defaultProps} />);

    expect(screen.getByText('Choose Avatar')).toBeInTheDocument();
    expect(screen.getByText('Customize your look')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
  });

  it('should open builder modal on click', async () => {
    const user = userEvent.setup();
    render(<AvatarSelector {...defaultProps} />);

    expect(screen.queryByTestId('avatar-builder-modal')).not.toBeInTheDocument();

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByTestId('avatar-builder-modal')).toBeInTheDocument();
  });

  it('should call onAvatarChange when saving from builder', async () => {
    const user = userEvent.setup();
    render(<AvatarSelector {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Save Avatar'));

    expect(mockOnAvatarChange).toHaveBeenCalledWith(
      expect.objectContaining({ eyes: 'star' })
    );
  });

  it('should close builder without saving on close', async () => {
    const user = userEvent.setup();
    render(<AvatarSelector {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Close Builder'));

    expect(mockOnAvatarChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('avatar-builder-modal')).not.toBeInTheDocument();
  });

  it('should use neo-brutalist styling', () => {
    render(<AvatarSelector {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('shadow-hard-sm');
    expect(button).toHaveClass('bg-neo-navy/40');
  });

  it('should render with null selectedAvatar (generates random)', () => {
    render(<AvatarSelector selectedAvatar={null} onAvatarChange={mockOnAvatarChange} />);

    expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument();
  });

  it('passes multiplayer mode to AvatarRenderer (pink frame in MP context)', () => {
    render(<AvatarSelector {...defaultProps} />);
    const renderers = screen.getAllByTestId('avatar-renderer');
    renderers.forEach((r) => {
      expect(r.getAttribute('data-mode')).toBe('multiplayer');
    });
  });
});
