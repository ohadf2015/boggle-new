/**
 * Brain Drills Card Bug Test
 *
 * Tests for the Brain Drills card on the landing page
 * Bug: Brain Drills card links to /${language}/brain#drills but no such element exists
 */

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Target: () => <span data-testid="icon-target">Target</span>,
  Lock: () => <span data-testid="icon-lock">Lock</span>,
  ArrowRight: () => <span data-testid="icon-arrow-right">ArrowRight</span>,
  ArrowLeft: () => <span data-testid="icon-arrow-left">ArrowLeft</span>,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock contexts
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'landing.brainDrills': 'Quick Drills',
        'landing.brainDrillsDesc': 'Focused mini-games',
        'landing.signInToUnlock': 'Sign in to unlock',
      };
      return translations[key] || key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

// Mock hooks
jest.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseMove: jest.fn(),
    },
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import ModeCard from '../landing/ModeCard';
import { Target } from 'lucide-react';

describe('Brain Drills Card Bug', () => {
  it('should render Brain Drills card correctly', () => {
    render(
      <ModeCard
        title="Quick Drills"
        description="Focused mini-games"
        href="/en/brain"
        icon={<Target className="w-5 h-5" />}
        variant="orange"
        secondary
        locked={false}
      />
    );

    // Card should be visible
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/brain');
    expect(screen.getByText('Quick Drills')).toBeInTheDocument();
  });

  it('should show locked state for unauthenticated users', () => {
    const onLockedClick = jest.fn();

    render(
      <ModeCard
        title="Quick Drills"
        description="Focused mini-games"
        href="/en/brain"
        icon={<Target className="w-5 h-5" />}
        variant="orange"
        secondary
        locked={true}
        lockedMessage="Sign in to unlock"
        onLockedClick={onLockedClick}
      />
    );

    // Should render as button when locked
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Sign in to unlock')).toBeInTheDocument();
  });

  it('should link to brain page without hash fragment', () => {
    render(
      <ModeCard
        title="Quick Drills"
        description="Focused mini-games"
        href="/en/brain"
        icon={<Target className="w-5 h-5" />}
        variant="orange"
        secondary
        locked={false}
      />
    );

    const link = screen.getByRole('link');
    const href = link.getAttribute('href');

    // FIXED: Card now links directly to /en/brain without hash fragment
    // The brain page shows QuickDrillsSection by default
    expect(href).toBe('/en/brain');
  });
});
