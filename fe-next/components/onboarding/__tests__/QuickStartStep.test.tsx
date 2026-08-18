import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion — same shape the sibling onboarding tests use.
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef(function MotionComponent({ children, ...props }: any, ref: any) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  const motion = new Proxy({} as Record<string, any>, {
    get: (_target, prop: string) => createMotionComponent(prop),
  });
  return {
    motion,
    m: motion,
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

const mockSetLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    language: 'en',
    dir: 'ltr',
    setLanguage: (...args: any[]) => mockSetLanguage(...args),
  }),
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div data-testid="avatar-builder" /> : null),
}));

vi.mock('../OnboardingGoogleSignup', () => ({
  __esModule: true,
  default: () => <div data-testid="google-signup" />,
}));

// The demo board leads the screen now. Stubbed here so these tests stay about
// the identity/PLAY behaviour they were written for — the real MiniGrid pulls
// framer-motion's useMotionValue/useSpring/useTransform, which this file's
// lightweight framer mock does not provide. Board behaviour is covered in
// QuickStartStep.showsTheGame.test.tsx.
vi.mock('../MiniGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="ftue-demo-grid" />,
}));

vi.mock('@/utils/onboardingNameSuggestions', () => ({
  suggestPlayerName: () => 'WordWizard',
}));

import QuickStartStep from '../QuickStartStep';

describe('QuickStartStep', () => {
  const setup = (props: Partial<React.ComponentProps<typeof QuickStartStep>> = {}) => {
    const onPlay = vi.fn();
    const onHowToPlay = vi.fn();
    const onHaveAccount = vi.fn();
    render(
      <QuickStartStep
        onPlay={onPlay}
        onHowToPlay={onHowToPlay}
        onHaveAccount={onHaveAccount}
        {...props}
      />
    );
    return { onPlay, onHowToPlay, onHaveAccount };
  };

  beforeEach(() => {
    mockSetLanguage.mockClear();
  });

  // The whole point of the refactor: nothing is a gate. A player who reads
  // nothing and taps the biggest button must land in a game.
  it('starts the game immediately with the pre-filled name, with no edits', () => {
    const { onPlay } = setup();

    fireEvent.click(screen.getByTestId('quick-start-play'));

    expect(onPlay).toHaveBeenCalledTimes(1);
    const [name, , nameEdited] = onPlay.mock.calls[0];
    expect(name).toBe('WordWizard');
    expect(nameEdited).toBe(false);
  });

  it('pre-fills the name field so identity is optional, not required', () => {
    setup();
    expect(screen.getByTestId('quick-start-name')).toHaveValue('WordWizard');
  });

  it('never disables the play button, even when the name is emptied', () => {
    const { onPlay } = setup();

    const input = screen.getByTestId('quick-start-name');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('quick-start-play'));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('reports an edited name and flags it as edited', () => {
    const { onPlay } = setup();

    fireEvent.change(screen.getByTestId('quick-start-name'), { target: { value: 'Ohad' } });
    fireEvent.click(screen.getByTestId('quick-start-play'));

    const [name, , nameEdited] = onPlay.mock.calls[0];
    expect(name).toBe('Ohad');
    expect(nameEdited).toBe(true);
  });

  // The old LanguageSelect step needed TWO taps on the same flag (select, then
  // confirm) — the "how do I continue?" bug. One tap must be enough now.
  it('applies a language in a single tap, without advancing the flow', () => {
    const { onPlay } = setup();

    fireEvent.click(screen.getByTestId('quick-start-lang-sv'));

    expect(mockSetLanguage).toHaveBeenCalledWith('sv', { skipNavigation: true });
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('offers the tutorial as an opt-in choice rather than a gate', () => {
    const { onHowToPlay } = setup();

    fireEvent.click(screen.getByTestId('quick-start-how-to-play'));

    expect(onHowToPlay).toHaveBeenCalledTimes(1);
  });

  it('lets an existing player reach sign-in', () => {
    const { onHaveAccount } = setup();

    fireEvent.click(screen.getByTestId('quick-start-have-account'));

    expect(onHaveAccount).toHaveBeenCalledTimes(1);
  });

  it('opens the avatar builder on demand and keeps it closed by default', () => {
    setup();
    expect(screen.queryByTestId('avatar-builder')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quick-start-avatar'));

    expect(screen.getByTestId('avatar-builder')).toBeInTheDocument();
  });

  it('hides the sign-in shortcut where external auth is unavailable', () => {
    setup({ onHaveAccount: undefined });
    expect(screen.queryByTestId('quick-start-have-account')).not.toBeInTheDocument();
  });

  // Streak Ignition (t_89663cfc): the sub-line sets the expectation that
  // tapping PLAY is safe and instant — quick game, no account wall.
  it('sets expectations under PLAY: quick game, no signup needed', () => {
    setup();
    expect(screen.getByTestId('quick-start-play-sub')).toHaveTextContent(
      'onboarding.quickStart.playSub',
    );
  });
});
