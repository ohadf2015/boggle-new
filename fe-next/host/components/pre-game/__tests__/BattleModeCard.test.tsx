import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
