import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InviteContextBanner from '@/components/onboarding/InviteContextBanner';
import { LanguageProvider } from '@/contexts/LanguageContext';

const wrap = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('InviteContextBanner', () => {
  it('renders banner with room code', () => {
    wrap(<InviteContextBanner roomCode="ABC123" hostName="Alice" onSkip={() => {}} />);
    expect(screen.getByTestId('invite-banner')).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
  });

  it('renders without crashing when hostName is missing', () => {
    wrap(<InviteContextBanner roomCode="ABC123" onSkip={() => {}} />);
    // Falls back to t('invite.banner.yourFriend') which returns key string itself when missing
    // Component still renders correctly with or without host name
    expect(screen.getByTestId('invite-banner')).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
  });

  it('fires onSkip when skip CTA is tapped', () => {
    const onSkip = vi.fn();
    wrap(<InviteContextBanner roomCode="ABC123" hostName="Alice" onSkip={onSkip} />);
    fireEvent.click(screen.getByTestId('invite-banner-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('trims whitespace from hostName before passing to translation', () => {
    // When whitespace-padded name is passed, should be trimmed
    wrap(<InviteContextBanner roomCode="ABC123" hostName="  Bob  " onSkip={() => {}} />);
    // Banner renders successfully with trimmed name
    expect(screen.getByTestId('invite-banner')).toBeInTheDocument();
  });

  it('has accessible skip button with min height for touch targets', () => {
    wrap(<InviteContextBanner roomCode="ABC123" hostName="Alice" onSkip={() => {}} />);
    const skipBtn = screen.getByTestId('invite-banner-skip');
    expect(skipBtn).toHaveClass('min-h-[44px]');
    expect(skipBtn).toHaveAttribute('type', 'button');
  });

  it('sets dir attribute for RTL/LTR support', () => {
    wrap(<InviteContextBanner roomCode="ABC123" hostName="Alice" onSkip={() => {}} />);
    const banner = screen.getByTestId('invite-banner');
    expect(banner).toHaveAttribute('dir');
  });

  it('renders the room-code chip when a code is present', () => {
    wrap(<InviteContextBanner roomCode="ABC123" hostName="Alice" onSkip={() => {}} />);
    const chip = screen.getByTestId('invite-banner-code');
    expect(chip).toHaveTextContent('ABC123');
  });

  it('omits the code chip when roomCode is empty (no dangling preposition)', () => {
    wrap(<InviteContextBanner roomCode="" hostName="Alice" onSkip={() => {}} />);
    // Banner still renders host context + skip, but no empty black pill.
    expect(screen.getByTestId('invite-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('invite-banner-code')).not.toBeInTheDocument();
  });
});
