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

describe('BattleModeCard — Blast gating', () => {
  const baseProps = {
    selectedGameMode: 'random' as const,
    setSelectedGameMode: vi.fn(),
    t,
  };

  it('shows Blast in the picker for admins', () => {
    render(<BattleModeCard {...baseProps} isAdmin={true} />);
    const blastButton = screen.getByTestId('game-mode-blast');
    expect(blastButton).toBeInTheDocument();
  });

  it('hides Blast from the picker for non-admins', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    const blastButton = screen.queryByTestId('game-mode-blast');
    expect(blastButton).not.toBeInTheDocument();
  });

  it('hides Blast when isAdmin is undefined', () => {
    render(<BattleModeCard {...baseProps} />);
    const blastButton = screen.queryByTestId('game-mode-blast');
    expect(blastButton).not.toBeInTheDocument();
  });

  it('shows other modes regardless of admin status', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    expect(screen.getByTestId('game-mode-random')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-classic')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-word-hunt')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-wheel-rush')).toBeInTheDocument();
  });
});
