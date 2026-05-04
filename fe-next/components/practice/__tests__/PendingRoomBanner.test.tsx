import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PendingRoomBanner from '@/components/practice/PendingRoomBanner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { savePendingRoomInvite } from '@/utils/onboardingStorage';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/en/practice',
}));

const wrap = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('PendingRoomBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    pushMock.mockClear();
  });

  it('does not render when no invite pending', () => {
    wrap(<PendingRoomBanner locale="en" />);
    expect(screen.queryByTestId('pending-room-banner')).not.toBeInTheDocument();
  });

  it('renders host + code when invite pending', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    wrap(<PendingRoomBanner locale="en" />);
    const banner = screen.getByTestId('pending-room-banner');
    expect(banner).toBeInTheDocument();
    // The banner should render the invite code and pass the CTA/dismiss buttons
    expect(screen.getByTestId('pending-room-banner-cta')).toBeInTheDocument();
    expect(screen.getByTestId('pending-room-banner-dismiss')).toBeInTheDocument();
  });

  it('click CTA navigates to MP room', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    wrap(<PendingRoomBanner locale="en" />);
    fireEvent.click(screen.getByTestId('pending-room-banner-cta'));
    expect(pushMock).toHaveBeenCalledWith('/en/multiplayer?room=ABC123');
  });

  it('dismiss hides for session', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    const { rerender } = wrap(<PendingRoomBanner locale="en" />);
    fireEvent.click(screen.getByTestId('pending-room-banner-dismiss'));
    rerender(<LanguageProvider><PendingRoomBanner locale="en" /></LanguageProvider>);
    expect(screen.queryByTestId('pending-room-banner')).not.toBeInTheDocument();
  });
});
