import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div> },
}));
vi.mock('@/components/ui/CoinBalanceBadge', () => ({ CoinBalanceBadge: () => <div /> }));

import { ShareSection, type ShareSectionProps } from '../ShareSection';

const t = (key: string) => key;

function renderWin(overrides: Partial<ShareSectionProps> = {}) {
  const props: ShareSectionProps = {
    solved: true,
    onShare: vi.fn(),
    onChallengeShare: vi.fn(),
    onRetry: vi.fn(),
    canAffordRetry: false,
    retryCost: 50,
    currentCoins: 0,
    onWhatsApp: vi.fn(),
    onTwitter: vi.fn(),
    onTelegram: vi.fn(),
    onCopy: vi.fn(),
    onDownloadImage: vi.fn(),
    copied: false,
    isGeneratingImage: false,
    t,
    ...overrides,
  };
  render(<ShareSection {...props} />);
  return props;
}

describe('ShareSection – a winner can share the result itself, not only a challenge', () => {
  it('Given a solve, When the player taps Share my result, Then the result recap is shared', () => {
    const props = renderWin();
    fireEvent.click(screen.getByRole('button', { name: /wordHunt\.results\.shareResult/ }));
    expect(props.onShare).toHaveBeenCalledTimes(1);
    expect(props.onChallengeShare).not.toHaveBeenCalled();
  });

  it('Given a solve, When the player taps Copy, Then the recap goes to the clipboard', () => {
    const props = renderWin();
    fireEvent.click(screen.getByRole('button', { name: /wordHunt\.results\.copyResult/ }));
    expect(props.onCopy).toHaveBeenCalledTimes(1);
  });

  it('Given the recap was just copied, Then the copy button says so', () => {
    renderWin({ copied: true });
    expect(screen.getByRole('button', { name: /wordHunt\.results\.copied/ })).toBeInTheDocument();
  });

  it('Given a solve, Then Challenge friends stays the primary action', () => {
    renderWin();
    expect(screen.getAllByRole('button')[0]).toHaveTextContent('wordHunt.results.challengeFriends');
  });
});
