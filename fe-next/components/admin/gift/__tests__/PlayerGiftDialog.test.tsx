import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/image', () => ({ default: () => null }));
// Real selector fetches; this one just seeds like the real one does on mount.
vi.mock('../PlayerSelector', async () => {
  const React = await import('react');
  return {
    PlayerSelector: ({ initialRecipients, onSelectionChange, selectedPlayers }: any) => {
      React.useEffect(() => {
        if (initialRecipients?.length && selectedPlayers.length === 0) onSelectionChange(initialRecipients);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="recipients">{selectedPlayers.map((p: any) => p.username).join(',')}</div>;
    },
  };
});
vi.mock('../BadgeSelector', () => ({ BadgeSelector: () => null }));

import { PlayerGiftDialog } from '../PlayerGiftDialog';

const ana = { id: 'a1', username: 'ana', display_name: 'Ana' } as never;
const ben = { id: 'b1', username: 'ben', display_name: 'Ben' } as never;
const sendBtn = () => screen.getByRole('button', { name: /Send Gift/i });

describe('PlayerGiftDialog', () => {
  it('can send straight away once a recipient is chosen: the preselected template fills title and message', () => {
    render(<PlayerGiftDialog open onOpenChange={vi.fn()} authToken="t" initialRecipients={[ana]} />);
    expect(sendBtn()).toBeEnabled();
    expect(screen.getByPlaceholderText('Title...')).toHaveValue('Top Player Recognition');
  });

  it('says why Send is disabled instead of just greying out', () => {
    render(<PlayerGiftDialog open onOpenChange={vi.fn()} authToken="t" />);
    expect(sendBtn()).toBeDisabled();
    expect(screen.getByText('Add a recipient to send')).toBeInTheDocument();
  });

  it('asks for a message when the custom template is empty', async () => {
    render(<PlayerGiftDialog open onOpenChange={vi.fn()} authToken="t" initialRecipients={[ana]} />);
    await userEvent.click(screen.getByRole('radio', { name: /Custom/ }));
    expect(sendBtn()).toBeDisabled();
    expect(screen.getByText('Add a title and message to send')).toBeInTheDocument();
  });

  it('opens fresh for a different player after being closed without sending', () => {
    const { rerender } = render(<PlayerGiftDialog open onOpenChange={vi.fn()} authToken="t" initialRecipients={[ana]} />);
    expect(screen.getByTestId('recipients')).toHaveTextContent('ana');
    rerender(<PlayerGiftDialog open={false} onOpenChange={vi.fn()} authToken="t" initialRecipients={[ben]} />);
    rerender(<PlayerGiftDialog open onOpenChange={vi.fn()} authToken="t" initialRecipients={[ben]} />);
    expect(screen.getByTestId('recipients')).toHaveTextContent('ben');
    expect(screen.getByTestId('recipients')).not.toHaveTextContent('ana');
  });
});
