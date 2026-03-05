import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileSetupStep from '../ProfileSetupStep';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    return <div ref={ref} {...props}>{children}</div>;
  });
  const MotionButton = React.forwardRef(function MotionButton({ children, ...props }: any, ref: any) {
    return <button ref={ref} {...props}>{children}</button>;
  });
  return {
    motion: { div: MotionDiv, button: MotionButton },
    AnimatePresence: function AnimatePresence({ children }: any) { return <>{children}</>; },
  };
});

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: function MockImage(props: any) { return <img {...props} />; },
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Check: () => <div>Check</div>,
  X: () => <div>X</div>,
  Save: () => <div>Save</div>,
}));

// Mock avatar config
jest.mock('@/utils/avatarConfig', () => ({
  AVATARS: [
    { id: 'avatar1', name: 'Fox' },
    { id: 'avatar2', name: 'Bear' },
  ],
  getAvatarPath: (avatar: any) => `/avatars/${avatar.id}.png`,
  getAvatarById: (id: string) => ({ id, name: id === 'avatar1' ? 'Fox' : 'Bear' }),
}));

describe('ProfileSetupStep - deferred mode', () => {
  const defaultProps = {
    selectedAvatarId: 'avatar1',
    displayName: 'Fox',
    onAvatarSelect: jest.fn(),
    onNameChange: jest.fn(),
  };

  test('should render full profile setup when deferred is false', () => {
    render(
      <LanguageProvider>
        <ProfileSetupStep {...defaultProps} deferred={false} />
      </LanguageProvider>
    );

    // Should show the full profile setup UI (avatar grid, name input)
    expect(screen.getByDisplayValue('Fox')).toBeInTheDocument();
  });

  test('should render gentle prompt when deferred is true', () => {
    render(
      <LanguageProvider>
        <ProfileSetupStep {...defaultProps} deferred={true} />
      </LanguageProvider>
    );

    // Should show deferred prompt instead of full setup
    expect(screen.getByTestId('deferred-profile-prompt')).toBeInTheDocument();
  });

  test('should render full setup by default (no deferred prop)', () => {
    render(
      <LanguageProvider>
        <ProfileSetupStep {...defaultProps} />
      </LanguageProvider>
    );

    // Default behavior - full setup
    expect(screen.getByDisplayValue('Fox')).toBeInTheDocument();
  });
});
