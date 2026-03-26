import React from 'react';
import { render, screen } from '@testing-library/react';
import StreakMilestoneCelebration from '@/components/daily/StreakMilestoneCelebration';

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`celebration-mascot-${variant}`} />
  ),
  CelebrationMascot: ({ variant }: { variant: string }) => (
    <div data-testid={`celebration-mascot-${variant}`} />
  ),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

vi.mock('framer-motion', () => ({
  ...vi.importActual('framer-motion'),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
    h2: ({ children, ...rest }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => (
      <h2 {...rest}>{children}</h2>
    ),
    p: ({ children, ...rest }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) => (
      <p {...rest}>{children}</p>
    ),
    button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button {...rest}>{children}</button>
    ),
  },
  m: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  streak: 7,
  emoji: '🔥',
  title: 'Week Warrior!',
  subtitle: '7 days in a row!',
};

describe('StreakMilestoneCelebration - mascot', () => {
  it('renders celebration mascot when modal is open', () => {
    render(<StreakMilestoneCelebration {...baseProps} isOpen={true} />);
    expect(screen.getByTestId('celebration-mascot-celebration')).toBeInTheDocument();
  });

  it('does not render mascot when modal is closed', () => {
    render(<StreakMilestoneCelebration {...baseProps} isOpen={false} />);
    expect(screen.queryByTestId('celebration-mascot-celebration')).not.toBeInTheDocument();
  });
});
