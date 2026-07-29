/**
 * TDD: ShareSection – Challenge CTA
 *
 * When onChallengeShare prop is provided AND solved=true,
 * clicking the winner share button should call onChallengeShare.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ── framer-motion ────────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// ── UI deps ──────────────────────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/CoinBalanceBadge', () => ({
  CoinBalanceBadge: () => <div data-testid="coin-balance-badge" />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// ── import AFTER mocks ────────────────────────────────────────────────────────
import { ShareSection } from '../ShareSection';

const t = (key: string) => key;

describe('ShareSection – Challenge CTA', () => {
  it('calls onChallengeShare when winner share button is clicked and onChallengeShare provided', () => {
    const onChallengeShare = vi.fn();
    const onShare = vi.fn();

    render(
      <ShareSection
        solved={true}
        onShare={onShare}
        onChallengeShare={onChallengeShare}
        onRetry={vi.fn()}
        canAffordRetry={false}
        retryCost={50}
        currentCoins={0}
        onWhatsApp={vi.fn()}
        onTwitter={vi.fn()}
        onTelegram={vi.fn()}
        onCopy={vi.fn()}
        onDownloadImage={vi.fn()}
        copied={false}
        isGeneratingImage={false}
        t={t}
      />
    );

    // For solved=true, only one button is rendered (Challenge Friends)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);

    expect(onChallengeShare).toHaveBeenCalledTimes(1);
    expect(onShare).not.toHaveBeenCalled();
  });

  it('falls back to onShare when onChallengeShare is not provided (solved=true)', () => {
    const onShare = vi.fn();

    render(
      <ShareSection
        solved={true}
        onShare={onShare}
        onRetry={vi.fn()}
        canAffordRetry={false}
        retryCost={50}
        currentCoins={0}
        onWhatsApp={vi.fn()}
        onTwitter={vi.fn()}
        onTelegram={vi.fn()}
        onCopy={vi.fn()}
        onDownloadImage={vi.fn()}
        copied={false}
        isGeneratingImage={false}
        t={t}
      />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('calls onShare (not onChallengeShare) for failed players via share button', () => {
    const onChallengeShare = vi.fn();
    const onShare = vi.fn();

    render(
      <ShareSection
        solved={false}
        onShare={onShare}
        onChallengeShare={onChallengeShare}
        onRetry={vi.fn()}
        canAffordRetry={true}
        retryCost={50}
        currentCoins={100}
        onWhatsApp={vi.fn()}
        onTwitter={vi.fn()}
        onTelegram={vi.fn()}
        onCopy={vi.fn()}
        onDownloadImage={vi.fn()}
        copied={false}
        isGeneratingImage={false}
        t={t}
      />
    );

    // For solved=false there are two buttons: Retry + Share
    const buttons = screen.getAllByRole('button');
    // Click the Share button (second one)
    const shareBtn = buttons.find((b) => b.textContent?.includes('wordHunt.results.share'));
    expect(shareBtn).toBeTruthy();
    fireEvent.click(shareBtn!);

    expect(onChallengeShare).not.toHaveBeenCalled();
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
