import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeHubClient from '@/app/[locale]/practice/PageClient';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { savePendingRoomInvite } from '@/utils/onboardingStorage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: () => {} }),
}));
vi.mock('@/utils/haptics', () => ({ haptics: { tap: () => {} } }));

// A non-zero streak so any lingering streak chip would actually render —
// proves the chip is gone by design, not just hidden by a zero-state guard.
vi.mock('@/hooks/usePracticeStreak', () => ({
  usePracticeStreak: () => ({ current: 5, longest: 5 }),
  getPracticeStreak: () => ({ current: 5, longest: 5 }),
}));

// Mutable completed-set so individual tests can simulate progress.
const mockCompleted = { current: new Set<string>() };
vi.mock('@/components/practice/usePracticeProgress', () => ({
  usePracticeProgress: () => mockCompleted.current,
}));

beforeEach(() => {
  // Mark FTUE complete so the gate lets the hub render in tests.
  window.localStorage.setItem('lexiclash_onboarding_completed', 'true');
  mockCompleted.current = new Set();
  sessionStorage.clear();
});

const wrap = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('PracticeHubClient invite banner', () => {
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

describe('PracticeHubClient tutorial simplification', () => {
  it('offers a clear way back to the homepage', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('practice-hub-back')).toHaveAttribute('href', '/en');
  });

  it('does not show a streak chip — the tutorial just teaches, it is not scored play', () => {
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.queryByTestId('practice-streak-chip')).toBeNull();
  });

  it('renders an incomplete mode as a clickable link', () => {
    wrap(<PracticeHubClient locale="en" />);
    const tile = screen.getByTestId('practice-tile-classic');
    expect(tile.tagName).toBe('A');
    expect(tile).toHaveAttribute('href', '/en/practice/classic');
  });

  it('renders a completed mode as a non-interactive, clearly-done card (not a button)', () => {
    mockCompleted.current = new Set(['classic']);
    wrap(<PracticeHubClient locale="en" />);
    const tile = screen.getByTestId('practice-tile-classic');
    expect(tile.tagName).not.toBe('A');
    expect(tile).not.toHaveAttribute('href');
    expect(tile).toHaveAttribute('data-complete', 'true');
  });

  it('flags the next mode to play so the path through the tutorial is obvious', () => {
    mockCompleted.current = new Set(['classic']);
    wrap(<PracticeHubClient locale="en" />);
    expect(screen.getByTestId('practice-tile-wordHunt')).toHaveAttribute('data-next', 'true');
    expect(screen.getByTestId('practice-tile-classic')).toHaveAttribute('data-next', 'false');
  });
});
