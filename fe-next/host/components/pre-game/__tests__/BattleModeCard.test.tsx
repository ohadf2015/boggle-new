import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BattleModeCard } from '../BattleModeCard';

vi.mock('framer-motion', () => {
  const Btn = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, whileTap, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    ),
  );
  const Div = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    ),
  );
  const Span = React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, ...props }, ref) => (
      <span ref={ref} {...props}>{children}</span>
    ),
  );
  Btn.displayName = 'MotionBtn';
  Div.displayName = 'MotionDiv';
  Span.displayName = 'MotionSpan';
  return {
    m: { button: Btn, div: Div, span: Span },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const t = (key: string) => key;

describe('BattleModeCard — Blast visibility', () => {
  // Blast is offered to ALL players now (gate removed after MP-blast parity —
  // BattleModeCard.tsx). These assert the public contract; isAdmin no longer
  // gates Blast (it only gates the Word Tower preview).
  const baseProps = {
    selectedGameMode: 'random' as const,
    setSelectedGameMode: vi.fn(),
    t,
  };

  it('shows Blast in the picker for admins', () => {
    render(<BattleModeCard {...baseProps} isAdmin={true} />);
    expect(screen.getByTestId('game-mode-blast')).toBeInTheDocument();
  });

  it('shows Blast in the picker for non-admins too', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    expect(screen.getByTestId('game-mode-blast')).toBeInTheDocument();
  });

  it('shows Blast when isAdmin is undefined', () => {
    render(<BattleModeCard {...baseProps} />);
    expect(screen.getByTestId('game-mode-blast')).toBeInTheDocument();
  });

  it('shows other modes regardless of admin status', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    expect(screen.getByTestId('game-mode-random')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-classic')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-word-hunt')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-wheel-rush')).toBeInTheDocument();
  });
});

describe('BattleModeCard — Showcase cards (expand selected on click)', () => {
  const baseProps = {
    selectedGameMode: 'classic' as const,
    setSelectedGameMode: vi.fn(),
    t,
  };

  // To keep the grid short, ONLY the selected mode reveals its one-line rule;
  // the other cards stay compact (icon + name). getModeDescription() routes
  // through the gameModes.*.description i18n keys, so with the identity `t` the
  // description renders as its key string.
  it('shows the description only for the selected mode', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    // Selected = classic → its description is visible…
    expect(screen.getByText('gameModes.classic.description')).toBeInTheDocument();
    // …while unselected modes do NOT spend vertical space on a description.
    expect(screen.queryByText('gameModes.randomDescription')).toBeNull();
    expect(screen.queryByText('gameModes.wordHunt.description')).toBeNull();
    expect(screen.queryByText('gameModes.blast.description')).toBeNull();
  });

  it('keeps every mode name visible even when collapsed', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    expect(screen.getByText('gameModes.classic.name')).toBeInTheDocument();
    expect(screen.getByText('gameModes.random')).toBeInTheDocument();
    expect(screen.getByText('gameModes.wordHunt.name')).toBeInTheDocument();
    expect(screen.getByText('gameModes.blast.name')).toBeInTheDocument();
  });

  it('reveals a freshly selected mode’s description', () => {
    // Re-render with blast selected → blast now shows its rule, classic collapses.
    render(<BattleModeCard {...baseProps} selectedGameMode={'blast'} isAdmin={false} />);
    expect(screen.getByText('gameModes.blast.description')).toBeInTheDocument();
    expect(screen.queryByText('gameModes.classic.description')).toBeNull();
  });

  it('still fires setSelectedGameMode when a mode card is clicked', () => {
    const setSelectedGameMode = vi.fn();
    render(<BattleModeCard {...baseProps} setSelectedGameMode={setSelectedGameMode} isAdmin={false} />);
    fireEvent.click(screen.getByTestId('game-mode-blast'));
    expect(setSelectedGameMode).toHaveBeenCalledWith('blast');
  });
});
