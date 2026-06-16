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
    m: new Proxy({ div: MotionDiv, button: MotionDiv }, {
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
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock the optional Google signup panel — it has its own test and pulls in the
// auth stack (supabase, OAuth hooks) we don't want loaded here.
vi.mock('../OnboardingGoogleSignup', () => ({
  __esModule: true,
  default: () => <div data-testid="onboarding-google-signup" />,
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

// Mock the locale-aware name suggester so the initial value (and thus the
// character counter) is deterministic across tests.
vi.mock('@/utils/onboardingNameSuggestions', () => ({
  suggestPlayerName: () => 'StartName', // 9 chars
}));

// Mock InviteContextBanner
vi.mock('@/components/onboarding/InviteContextBanner', () => ({
  __esModule: true,
  default: ({ roomCode, hostName, onSkip }: any) => (
    <div data-testid="invite-banner">
      {hostName && <span>{hostName}</span>}
      <span>{roomCode}</span>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
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

  it('renders name input field', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders avatar preview', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
  });

  it('pre-fills the name with a suggested player name', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  it('does not submit when name is cleared to empty', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText("Let's go!"));
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it('does not submit a single-character name (min is 2, matching the hint)', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'A' } });
    fireEvent.click(screen.getByText("Let's go!"));
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it('labels the name field with a calm label, not the validation error string', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    // The field label must not reuse the shouting `validation.usernameRequired`
    // error string; it points at a dedicated `onboarding.name.label` key.
    expect(screen.queryByText('validation.usernameRequired')).not.toBeInTheDocument();
    expect(screen.getByText('onboarding.name.label')).toBeInTheDocument();
  });

  it('calls onComplete with name when form submitted', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'TestPlayer' } });
    fireEvent.click(screen.getByText("Let's go!"));
    expect(defaultProps.onComplete).toHaveBeenCalledWith(
      'TestPlayer',
      expect.any(Object),
      true
    );
  });

  it('reports nameEdited=false when user submits the auto-suggestion unchanged', () => {
    render(<QuickProfileSetup {...defaultProps} />);
    // Don't touch the input — submit straight away
    fireEvent.click(screen.getByText("Let's go!"));
    expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
    const args = defaultProps.onComplete.mock.calls[0];
    expect(args[2]).toBe(false);
  });

  describe('mobile IME / virtual keyboard resilience', () => {
    // Regression: on Android GBoard (incl. Spanish/Hebrew autocorrect & swipe
    // typing) the keyboard buffers composition and commits text WITHOUT firing
    // React's synthetic onChange. A naive `value={name}` controlled input then
    // keeps forcing the DOM back to the stale suggestion, so the user "can't
    // change their name". The field must mirror the live DOM value.

    it('reflects text committed via compositionEnd even when onChange never fires', () => {
      render(<QuickProfileSetup {...defaultProps} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      // Initial suggestion 'StartName' => 9 chars.
      expect(screen.getByText('9/20')).toBeInTheDocument();

      // Override the value setter so React's change tracker can't observe it
      // (this is exactly what a real mobile IME does), then fire only
      // compositionEnd — no synthetic onChange.
      Object.defineProperty(input, 'value', {
        configurable: true,
        writable: true,
        value: 'Bouncy Wolf', // 11 chars
      });
      fireEvent.compositionEnd(input, { data: 'Bouncy Wolf' });

      // The visible counter is driven by React state — it must update, proving
      // the field accepted the change.
      expect(screen.getByText('11/20')).toBeInTheDocument();
    });
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
        expect.objectContaining({ gender: 'female', skinColor: '#8D5524' }),
        expect.any(Boolean)
      );
    });
  });

  describe('QuickProfileSetup invite mode', () => {
    it('renders InviteContextBanner when inviteContext is provided', () => {
      render(
        <QuickProfileSetup
          onComplete={() => {}}
          hasPendingInvite
          inviteContext={{ roomCode: 'ABC123', hostName: 'Alice' }}
          onSkipInvite={() => {}}
        />
      );
      expect(screen.getByTestId('invite-banner')).toBeInTheDocument();
      expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    });

    it('does NOT render banner when inviteContext absent', () => {
      render(<QuickProfileSetup onComplete={() => {}} />);
      expect(screen.queryByTestId('invite-banner')).not.toBeInTheDocument();
    });
  });
});
