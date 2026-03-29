import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv(
    { children, ...props }: any,
    ref: any
  ) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  });
  return {
    motion: new Proxy({ div: MotionDiv, button: MotionDiv }, {
      get(target: any, prop: string) {
        return target[prop] || MotionDiv;
      },
    }),
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shuffle: () => <div data-testid="shuffle-icon" />,
  Pencil: () => <div data-testid="pencil-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock AvatarBuilderModal
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: ({ isOpen, onSave, onClose }: any) =>
    isOpen ? (
      <div data-testid="avatar-builder-modal">
        <button
          data-testid="builder-save"
          onClick={() =>
            onSave({
              gender: 'female',
              base: 'round',
              skinColor: '#8D5524',
              hairStyle: 'long',
              hairColor: '#FF0000',
              eyes: 'happy',
              mouth: 'grin',
              accessory: 'glasses',
            })
          }
        >
          Save
        </button>
        <button data-testid="builder-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'onboarding.ftue.niceWork': 'Nice work!',
        'onboarding.ftue.whatsYourName': 'What should we call you?',
        'onboarding.ftue.skip': 'Skip',
        'onboarding.ftue.letsGo': "Let's go!",
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-preview" />,
}));

// Mock customAvatar
vi.mock('@/shared/types/customAvatar', () => ({
  getRandomAvatarConfig: () => ({
    gender: 'male',
    base: 'round',
    skinColor: '#FFDBB4',
    hairStyle: 'spiky',
    hairColor: '#000000',
    eyes: 'default',
    mouth: 'smile',
    accessory: 'none',
  }),
}));

import QuickProfileSetup from '../QuickProfileSetup';

describe('QuickProfileSetup', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the slide-up profile card', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    expect(screen.getByTestId('quick-profile-setup')).toBeInTheDocument();
  });

  it('shows "Nice work!" heading', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    expect(screen.getByText('Nice work!')).toBeInTheDocument();
  });

  it('shows name prompt', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    expect(screen.getByText('What should we call you?')).toBeInTheDocument();
  });

  it('renders name input field', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders avatar preview', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
  });

  it('requires a name of at least 2 characters', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    // Clicking submit with empty name should not call onComplete
    fireEvent.click(screen.getByText("Let's go!"));
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete with name when form submitted', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'TestPlayer' } });
    fireEvent.click(screen.getByText("Let's go!"));
    expect(defaultProps.onComplete).toHaveBeenCalledWith(
      'TestPlayer',
      expect.any(Object)
    );
  });

  describe('avatar builder integration', () => {
    it('shows pencil edit indicator on avatar', () => {
      render(<QuickProfileSetup {...defaultProps} />);
      expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
    });

    it('opens avatar builder modal when avatar is clicked', () => {
      render(<QuickProfileSetup {...defaultProps} />);
      expect(screen.queryByTestId('avatar-builder-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('avatar-edit-button'));
      expect(screen.getByTestId('avatar-builder-modal')).toBeInTheDocument();
    });

    it('closes avatar builder modal on close', () => {
      render(<QuickProfileSetup {...defaultProps} />);
      fireEvent.click(screen.getByTestId('avatar-edit-button'));
      expect(screen.getByTestId('avatar-builder-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('builder-close'));
      expect(screen.queryByTestId('avatar-builder-modal')).not.toBeInTheDocument();
    });

    it('updates avatar when builder saves', () => {
      render(<QuickProfileSetup {...defaultProps} />);
      fireEvent.click(screen.getByTestId('avatar-edit-button'));
      fireEvent.click(screen.getByTestId('builder-save'));
      // Modal should close after save
      expect(screen.queryByTestId('avatar-builder-modal')).not.toBeInTheDocument();
    });

    it('uses saved avatar from builder in onComplete', () => {
      render(<QuickProfileSetup {...defaultProps} />);
      // Enter a name first
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Player' } });
      // Open builder, save custom avatar
      fireEvent.click(screen.getByTestId('avatar-edit-button'));
      fireEvent.click(screen.getByTestId('builder-save'));
      // Submit the form
      fireEvent.click(screen.getByText("Let's go!"));
      expect(defaultProps.onComplete).toHaveBeenCalledWith(
        'Player',
        expect.objectContaining({ gender: 'female', skinColor: '#8D5524' })
      );
    });
  });
});
