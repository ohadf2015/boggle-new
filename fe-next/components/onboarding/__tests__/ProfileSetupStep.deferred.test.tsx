import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileSetupStep from '../ProfileSetupStep';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    return <div ref={ref} {...props}>{children}</div>;
  });
  return {
    m: { div: MotionDiv },
    AnimatePresence: function AnimatePresence({ children }: any) { return <>{children}</>; },
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Check: () => <div>Check</div>,
  X: () => <div>X</div>,
  Pencil: () => <div>Pencil</div>,
}));

// Mock AvatarSelectorButton
vi.mock('@/components/join/AvatarSelectorButton', () => ({
  __esModule: true,
  default: function MockAvatarSelectorButton() {
    return <div data-testid="avatar-selector-button">AvatarSelector</div>;
  },
}));

describe('ProfileSetupStep - deferred mode', () => {
  const defaultProps = {
    customAvatar: DEFAULT_AVATAR_CONFIG,
    displayName: 'Fox',
    onAvatarSelect: vi.fn(),
    onNameChange: vi.fn(),
  };

  test('should render full profile setup when deferred is false', () => {
    render(
      <LanguageProvider>
        <ProfileSetupStep {...defaultProps} deferred={false} />
      </LanguageProvider>
    );

    expect(screen.getByDisplayValue('Fox')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-selector-button')).toBeInTheDocument();
  });

  test('should render gentle prompt when deferred is true', () => {
    render(
      <LanguageProvider>
        <ProfileSetupStep {...defaultProps} deferred={true} />
      </LanguageProvider>
    );

    expect(screen.getByTestId('deferred-profile-prompt')).toBeInTheDocument();
  });

  test('should render full setup by default (no deferred prop)', () => {
    render(
      <LanguageProvider>
        <ProfileSetupStep {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByDisplayValue('Fox')).toBeInTheDocument();
  });
});
