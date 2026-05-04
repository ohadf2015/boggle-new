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
