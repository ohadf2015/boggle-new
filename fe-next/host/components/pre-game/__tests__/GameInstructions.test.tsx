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

  it('renders an infographic image for the active step', () => {
    render(<GameInstructions selectedGameMode="classic" t={t} />);
    const img = screen.getByRole('img', { name: 'howToPlay.steps.basics.title' });
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('swipe-letters');
  });

  it('renders an infographic for blast mode', () => {
    render(<GameInstructions selectedGameMode="blast" t={t} />);
    const img = screen.getByRole('img', { name: 'gameModes.blast.name' });
    expect(img.getAttribute('src')).toContain('blast-mode');
  });

  it('renders an infographic for word-hunt mode', () => {
    render(<GameInstructions selectedGameMode="word-hunt" t={t} />);
    const img = screen.getByRole('img', { name: 'gameModes.wordHunt.name' });
    expect(img.getAttribute('src')).toContain('word-hunt-targets');
  });

  it('renders the wheel-spell infographic for wheel-rush mode', () => {
    render(<GameInstructions selectedGameMode="wheel-rush" t={t} />);
    const img = screen.getByRole('img', { name: 'gameModes.wheelRush.name' });
    expect(img.getAttribute('src')).toContain('wheel-spell');
  });

  it('uses the language-specific image directory based on lang prop', () => {
    render(<GameInstructions selectedGameMode="classic" t={t} lang="he" />);
    const img = screen.getByRole('img', { name: 'howToPlay.steps.basics.title' });
    expect(img.getAttribute('src')).toContain('he');
    expect(img.getAttribute('src')).toContain('swipe-letters');
  });

  it('falls back to en for unsupported languages', () => {
    render(<GameInstructions selectedGameMode="classic" t={t} lang={'fr' as never} />);
    const img = screen.getByRole('img', { name: 'howToPlay.steps.basics.title' });
    expect(img.getAttribute('src')).toContain('en');
  });
});
