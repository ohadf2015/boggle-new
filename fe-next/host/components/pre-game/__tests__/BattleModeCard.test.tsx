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
  Btn.displayName = 'MotionBtn';
  Div.displayName = 'MotionDiv';
  return {
    m: { button: Btn, div: Div },
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

describe('BattleModeCard — Showcase cards (per-mode description)', () => {
  const baseProps = {
    selectedGameMode: 'classic' as const,
    setSelectedGameMode: vi.fn(),
    t,
  };

  // Each mode card surfaces its own one-line rule via getModeDescription(),
  // which routes through the existing gameModes.*.description i18n keys.
  // With the identity `t`, the description renders as its key string.
  it('renders a description line for every visible mode', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    expect(screen.getByText('gameModes.randomDescription')).toBeInTheDocument();
    expect(screen.getByText('gameModes.classic.description')).toBeInTheDocument();
    expect(screen.getByText('gameModes.wordHunt.description')).toBeInTheDocument();
    expect(screen.getByText('gameModes.wheelRush.description')).toBeInTheDocument();
    expect(screen.getByText('gameModes.blast.description')).toBeInTheDocument();
  });

  it('keeps the mode name alongside its description', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    // name key + description key both present for classic
    expect(screen.getByText('gameModes.classic.name')).toBeInTheDocument();
    expect(screen.getByText('gameModes.classic.description')).toBeInTheDocument();
  });

  it('still fires setSelectedGameMode when a mode card is clicked', () => {
    const setSelectedGameMode = vi.fn();
    render(<BattleModeCard {...baseProps} setSelectedGameMode={setSelectedGameMode} isAdmin={false} />);
    fireEvent.click(screen.getByTestId('game-mode-blast'));
    expect(setSelectedGameMode).toHaveBeenCalledWith('blast');
  });
});
