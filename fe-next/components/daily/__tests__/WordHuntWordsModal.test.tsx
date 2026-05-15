import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange?: (o: boolean) => void; children: React.ReactNode }) =>
    open ? (
      <div data-testid="dialog">
        {children}
        <button type="button" aria-label="Close" onClick={() => onOpenChange?.(false)}>×</button>
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@radix-ui/react-visually-hidden', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { WordHuntWordsModal } from '../WordHuntWordsModal';

const t = (k: string, fb?: string) => fb || k;

const baseDiscovered = [
  { word: 'HELLO', timestamp: 1000, lifeGained: 2, tokensGained: 0 },
  { word: 'WORLD', timestamp: 2000, lifeGained: 1, tokensGained: 0 },
  { word: 'CAT', timestamp: 3000, lifeGained: 0, tokensGained: 5 },
];

describe('WordHuntWordsModal', () => {
  it('renders nothing when closed', () => {
    render(
      <WordHuntWordsModal
        isOpen={false}
        onClose={vi.fn()}
        playerName="Alice"
        wordsDiscovered={baseDiscovered}
        t={t}
      />
    );
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('shows player name in header when open', () => {
    render(
      <WordHuntWordsModal
        isOpen={true}
        onClose={vi.fn()}
        playerName="Alice"
        wordsDiscovered={baseDiscovered}
        t={t}
      />
    );
    expect(screen.getAllByText(/Alice/i).length).toBeGreaterThan(0);
  });

  it('shows all opponent words when myWordsDiscovered not provided', () => {
    render(
      <WordHuntWordsModal
        isOpen={true}
        onClose={vi.fn()}
        playerName="Bob"
        wordsDiscovered={baseDiscovered}
        t={t}
      />
    );
    expect(screen.getByText('HELLO')).toBeInTheDocument();
    expect(screen.getByText('WORLD')).toBeInTheDocument();
    expect(screen.getByText('CAT')).toBeInTheDocument();
  });

  it('diff mode: shows only words opponent found that I did not', () => {
    render(
      <WordHuntWordsModal
        isOpen={true}
        onClose={vi.fn()}
        playerName="Bob"
        wordsDiscovered={baseDiscovered}
        myWordsDiscovered={['HELLO', 'CAT']}
        t={t}
      />
    );
    expect(screen.queryByText('HELLO')).toBeNull();
    expect(screen.getByText('WORLD')).toBeInTheDocument();
    expect(screen.queryByText('CAT')).toBeNull();
  });

  it('shows empty state when diff reveals nothing missed', () => {
    render(
      <WordHuntWordsModal
        isOpen={true}
        onClose={vi.fn()}
        playerName="Bob"
        wordsDiscovered={baseDiscovered}
        myWordsDiscovered={['HELLO', 'WORLD', 'CAT']}
        t={t}
      />
    );
    expect(screen.queryByText('HELLO')).toBeNull();
    expect(screen.getByTestId('nothing-missed')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(
      <WordHuntWordsModal
        isOpen={true}
        onClose={onClose}
        playerName="Alice"
        wordsDiscovered={baseDiscovered}
        t={t}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
