// @vitest-environment jsdom
/**
 * SoloStartConfirmDialog — Invite Friends as primary action
 *
 * Requirements (2-CTA layout):
 * 1. "Invite Friends" button is present and is the primary CTA (lime)
 * 2. "Skip & Play with Bots" button is present as secondary
 * 3. "Wait for players" cancel is REMOVED
 * 4. Clicking "Invite Friends" triggers share/copy (native share or clipboard)
 * 5. "Skip & Play with Bots" calls onConfirm
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SoloStartConfirmDialog } from '../HostDialogs';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, className, onClick, whileTap: _wt, ...props }: React.ComponentProps<'button'> & { whileTap?: unknown }) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const t = (key: string) => {
  const map: Record<string, string> = {
    'hostView.soloStartTitle': 'No other players yet!',
    'hostView.soloStartDescription': 'Invite friends, or play with bots.',
    'hostView.soloStartCancel': 'Wait for players',
    'hostView.soloStartConfirm': 'Skip & Play with Bots',
    'hostView.inviteFriends': 'Rally your squad!',
    'share.copyLink': 'Copy Link',
    'share.linkCopied': 'Link copied! 🔗',
    'common.copied': 'Copied!',
  };
  return map[key] ?? key;
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn(),
  t,
  gameCode: 'ABC123',
};

describe('SoloStartConfirmDialog — invite primary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('renders invite friends button', () => {
    render(<SoloStartConfirmDialog {...defaultProps} />);
    expect(screen.getByTestId('solo-dialog-invite')).toBeTruthy();
  });

  it('invite button has lime/primary styling', () => {
    render(<SoloStartConfirmDialog {...defaultProps} />);
    const inviteBtn = screen.getByTestId('solo-dialog-invite');
    expect(inviteBtn.className).toMatch(/neo-lime/);
  });

  it('renders skip & play with bots as secondary button', () => {
    render(<SoloStartConfirmDialog {...defaultProps} />);
    expect(screen.getByTestId('solo-dialog-bots')).toBeTruthy();
  });

  it('does NOT render the wait-for-players cancel', () => {
    render(<SoloStartConfirmDialog {...defaultProps} />);
    expect(screen.queryByTestId('solo-dialog-wait')).toBeNull();
  });

  it('renders only two action buttons (invite + bots)', () => {
    render(<SoloStartConfirmDialog {...defaultProps} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('clicking play with bots calls onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<SoloStartConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('solo-dialog-bots'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('clicking invite copies link to clipboard when no native share', async () => {
    // Ensure native share is absent
    const originalShare = navigator.share;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });

    render(<SoloStartConfirmDialog {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('solo-dialog-invite'));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    if (originalShare) {
      Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
    }
  });

  it('invite button comes before bots button in DOM order', () => {
    render(<SoloStartConfirmDialog {...defaultProps} />);
    const all = screen.getAllByRole('button');
    const inviteIdx = all.findIndex(b => b.getAttribute('data-testid') === 'solo-dialog-invite');
    const botsIdx = all.findIndex(b => b.getAttribute('data-testid') === 'solo-dialog-bots');
    expect(inviteIdx).toBeLessThan(botsIdx);
  });
});
