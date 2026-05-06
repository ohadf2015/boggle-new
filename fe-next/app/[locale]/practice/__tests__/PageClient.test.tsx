import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeHubClient from '@/app/[locale]/practice/PageClient';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { savePendingRoomInvite } from '@/utils/onboardingStorage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: () => {} }),
}));
vi.mock('@/utils/haptics', () => ({ haptics: { tap: () => {} } }));
vi.mock('@/components/practice/PracticeStreakChip', () => ({
  default: () => <div data-testid="practice-streak-chip" />,
}));
vi.mock('@/components/practice/PracticeHubWelcome', () => ({
  default: () => <div data-testid="practice-hub-welcome" />,
}));
vi.mock('@/components/practice/usePracticeProgress', () => ({
  usePracticeProgress: () => new Set(),
}));

const wrap = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('PracticeHubClient invite banner', () => {
  beforeEach(() => sessionStorage.clear());

  it('shows PendingRoomBanner when invite pending', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('pending-room-banner')).toBeInTheDocument();
  });

  it('hides banner when no invite', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.queryByTestId('pending-room-banner')).not.toBeInTheDocument();
  });
});

describe('PracticeHubClient quick-start + skip CTAs', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders Quick Start + Skip All buttons above the tile grid', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('practice-hub-ctas')).toBeInTheDocument();
    expect(screen.getByTestId('practice-hub-quick-start')).toBeInTheDocument();
    expect(screen.getByTestId('practice-hub-skip-all')).toBeInTheDocument();
  });

  it('Quick Start button is the primary CTA (lime background, neo border)', () => {
    wrap(<PracticeHubClient locale="en" />);
    const quick = screen.getByTestId('practice-hub-quick-start');
    expect(quick.className).toMatch(/bg-neo-lime/);
    expect(quick.className).toMatch(/border-3/);
  });

  it('Skip All button is a prominent CTA (pink fill, neo border) so users always have a clear exit', () => {
    wrap(<PracticeHubClient locale="en" />);
    const skip = screen.getByTestId('practice-hub-skip-all');
    expect(skip.className).toMatch(/bg-neo-pink/);
    expect(skip.className).toMatch(/border-3/);
  });
});
