// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (k: string) => k, language: 'en' })),
}));

import { ReconnectingOverlay } from '../ReconnectingOverlay';
import { MPGameAbortedModal } from '../MPGameAbortedModal';

describe('ReconnectingOverlay', () => {
  it('renders attempt count and max attempts', () => {
    render(<ReconnectingOverlay attempt={3} maxAttempts={30} onGiveUp={vi.fn()} />);
    expect(screen.getByRole('dialog').textContent).toContain('3');
    expect(screen.getByRole('dialog').textContent).toContain('30');
  });

  it('shows "give up" button after 3 attempts (patience threshold)', () => {
    render(<ReconnectingOverlay attempt={3} maxAttempts={30} onGiveUp={vi.fn()} />);
    expect(screen.getByRole('button', { name: /mp\.reconnect\.giveUp/ })).toBeInTheDocument();
  });

  it('hides "give up" button on attempt 1 and 2', () => {
    const { rerender } = render(<ReconnectingOverlay attempt={1} maxAttempts={30} onGiveUp={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /mp\.reconnect\.giveUp/ })).not.toBeInTheDocument();
    rerender(<ReconnectingOverlay attempt={2} maxAttempts={30} onGiveUp={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /mp\.reconnect\.giveUp/ })).not.toBeInTheDocument();
  });

  it('calls onGiveUp when give-up button clicked', () => {
    const onGiveUp = vi.fn();
    render(<ReconnectingOverlay attempt={5} maxAttempts={30} onGiveUp={onGiveUp} />);
    fireEvent.click(screen.getByRole('button', { name: /mp\.reconnect\.giveUp/ }));
    expect(onGiveUp).toHaveBeenCalledOnce();
  });

  it('renders reconnecting text and spinner', () => {
    render(<ReconnectingOverlay attempt={1} maxAttempts={30} onGiveUp={vi.fn()} />);
    expect(screen.getByRole('dialog').textContent).toContain('mp.reconnect.title');
  });
});

describe('MPGameAbortedModal', () => {
  const defaultProps = {
    wordCount: 7,
    onContinueSolo: vi.fn(),
    onReturnToLobby: vi.fn(),
    boardSeed: 'game-abc-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders game-over message with word count', () => {
    render(<MPGameAbortedModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('mp.abort.title');
    expect(dialog.textContent).toContain('7');
  });

  it('"Continue Solo" CTA calls onContinueSolo', () => {
    const onContinueSolo = vi.fn();
    render(<MPGameAbortedModal {...defaultProps} onContinueSolo={onContinueSolo} />);
    fireEvent.click(screen.getByRole('button', { name: /mp\.abort\.continueSolo/ }));
    expect(onContinueSolo).toHaveBeenCalledOnce();
  });

  it('"Return to lobby" CTA calls onReturnToLobby', () => {
    const onReturnToLobby = vi.fn();
    render(<MPGameAbortedModal {...defaultProps} onReturnToLobby={onReturnToLobby} />);
    fireEvent.click(screen.getByRole('button', { name: /mp\.abort\.returnToLobby/ }));
    expect(onReturnToLobby).toHaveBeenCalledOnce();
  });
});
