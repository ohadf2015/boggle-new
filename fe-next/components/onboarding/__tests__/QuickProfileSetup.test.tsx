import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => {
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
    motion: { div: MotionDiv, button: MotionDiv },
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Shuffle: () => <div data-testid="shuffle-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
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
jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-preview" />,
}));

// Mock customAvatar
jest.mock('@/shared/types/customAvatar', () => ({
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
    onComplete: jest.fn(),
    onSkip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders skip button', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    const skipButton = screen.getByText('Skip');
    expect(skipButton).toBeInTheDocument();
  });

  it('calls onSkip when skip is clicked', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    fireEvent.click(screen.getByText('Skip'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
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
});
