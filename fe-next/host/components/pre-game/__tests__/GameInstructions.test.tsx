import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameInstructions } from '../GameInstructions';

vi.mock('framer-motion', () => {
  const Div = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    ),
  );
  Div.displayName = 'MotionDiv';
  return {
    motion: { div: Div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const t = (key: string) => key;

describe('GameInstructions', () => {
  it('expanded by default (no prop)', () => {
    render(<GameInstructions selectedGameMode="classic" t={t} />);
    expect(screen.getByText('howToPlay.steps.basics.title')).toBeTruthy();
  });

  it('collapsed when defaultOpen=false', () => {
    render(<GameInstructions selectedGameMode="classic" t={t} defaultOpen={false} />);
    expect(screen.queryByText('howToPlay.steps.basics.title')).toBeNull();
  });

  it('expanded when defaultOpen=true', () => {
    render(<GameInstructions selectedGameMode="classic" t={t} defaultOpen={true} />);
    expect(screen.getByText('howToPlay.steps.basics.title')).toBeTruthy();
  });
});
