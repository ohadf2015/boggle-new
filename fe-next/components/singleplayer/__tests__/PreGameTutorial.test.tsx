/**
 * PreGameTutorial Tests
 *
 * Single CTA screen (avatar builder / boost / start) shown before a
 * singleplayer game begins. The "how to play" teaching that used to live
 * here now happens via ModeCoach's in-game overlay instead — this component
 * is just the pre-game gate.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      const MotionComponent = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
        const { children, initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return React.createElement(prop, { ...rest, ref }, children);
      });
      MotionComponent.displayName = `m.${prop}`;
      return MotionComponent;
    },
  });
  return {
    motion,
    m: motion,
    LazyMotion: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    domAnimation: {},
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => null }));
vi.mock('@/components/boosts/BoostPicker', () => ({ BoostPicker: () => null }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

vi.mock('@/components/avatar/AvatarBuilderModal', () => {
  const MockAvatarBuilderModal = ({ isOpen }: { isOpen: boolean }) => {
    return isOpen ? <div data-testid="avatar-builder-modal" /> : null;
  };
  return { default: MockAvatarBuilderModal };
});

import PreGameTutorial from '../PreGameTutorial';

describe('PreGameTutorial', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the CTA screen immediately, with no welcome or practice step', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.getByText('preGameTutorial.tips.title')).toBeInTheDocument();
    expect(screen.getByTestId('mascot-celebration')).toBeInTheDocument();
    expect(screen.queryByText('preGameTutorial.welcome.title')).toBeNull();
    expect(screen.queryByText('preGameTutorial.practice.instruction')).toBeNull();
    expect(screen.queryByTestId('mini-grid')).toBeNull();
  });

  it('has no back/forward navigation or progress dots (single screen)', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.queryAllByTestId(/^progress-dot-/)).toHaveLength(0);
    expect(screen.queryByText('preGameTutorial.skip')).toBeNull();
  });

  it('"Let\'s Play!" calls onComplete', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    fireEvent.click(screen.getByText('preGameTutorial.letsPlay'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('avatar-builder CTA opens the avatar builder modal', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.queryByTestId('avatar-builder-modal')).toBeNull();
    fireEvent.click(screen.getByText('preGameTutorial.buildAvatar'));
    expect(screen.getByTestId('avatar-builder-modal')).toBeInTheDocument();
  });

  it('all text uses translation keys (no hardcoded strings)', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.getByText('preGameTutorial.tips.title')).toBeInTheDocument();
    expect(screen.getByText('preGameTutorial.tips.subtitle')).toBeInTheDocument();
    expect(screen.getByText('preGameTutorial.letsPlay')).toBeInTheDocument();
  });
});
