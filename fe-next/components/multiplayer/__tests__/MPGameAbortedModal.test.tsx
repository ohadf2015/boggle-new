import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MPGameAbortedModal } from '../MPGameAbortedModal';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className} data-testid="dialog-content">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('MPGameAbortedModal', () => {
  it('renders inside a Dialog with word count in the body', () => {
    render(
      <MPGameAbortedModal
        wordCount={7}
        boardSeed="seed"
        onContinueSolo={vi.fn()}
        onReturnToLobby={vi.fn()}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-content').textContent).toContain('mp.abort.body');
    expect(screen.getByTestId('dialog-content').textContent).toContain('7');
  });

  it('calls onContinueSolo when continue solo is clicked', async () => {
    const user = userEvent.setup();
    const onContinueSolo = vi.fn();
    render(
      <MPGameAbortedModal
        wordCount={3}
        boardSeed="seed"
        onContinueSolo={onContinueSolo}
        onReturnToLobby={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'mp.abort.continueSolo' }));
    expect(onContinueSolo).toHaveBeenCalledTimes(1);
  });

  it('calls onReturnToLobby when return to lobby is clicked', async () => {
    const user = userEvent.setup();
    const onReturnToLobby = vi.fn();
    render(
      <MPGameAbortedModal
        wordCount={3}
        boardSeed="seed"
        onContinueSolo={vi.fn()}
        onReturnToLobby={onReturnToLobby}
      />
    );
    await user.click(screen.getByRole('button', { name: 'mp.abort.returnToLobby' }));
    expect(onReturnToLobby).toHaveBeenCalledTimes(1);
  });
});
