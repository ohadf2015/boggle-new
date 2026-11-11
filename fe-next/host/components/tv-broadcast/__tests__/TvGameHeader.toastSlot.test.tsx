import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TvGameHeader from '../TvGameHeader';

vi.mock('framer-motion', () => {
  const pass = (Tag: 'div' | 'span') =>
    React.forwardRef(function Pass({ children, className, ...rest }: Record<string, unknown> & { children?: React.ReactNode; className?: string }, ref: React.Ref<HTMLElement>) {
      return React.createElement(Tag, { ref, className, 'data-testid': rest['data-testid'] }, children);
    });
  return { m: { div: pass('div'), span: pass('span') }, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
});
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true }));
vi.mock('../../../../components/CircularTimer', () => ({ __esModule: true, default: () => <div data-testid="circular-timer" /> }));

const t = (k: string) => k;

describe('TvGameHeader — toast slot beside the timer', () => {
  it('Given a toast slot, Then it renders inside the header row, not over the board', () => {
    render(<TvGameHeader compact remainingTime={60} timerValue={3} gameMode="classic" t={t} toastSlot={<span data-testid="toast" />} />);
    expect(screen.getByTestId('tv-header-toast-slot')).toContainElement(screen.getByTestId('toast'));
  });

  it('Given the compact classroom header, Then both side columns share the width so the timer stays centred', () => {
    render(<TvGameHeader compact remainingTime={60} timerValue={3} gameMode="classic" t={t} toastSlot={<span />} />);
    expect(screen.getByTestId('tv-header-toast-slot').className).toContain('min-w-0');
    expect(screen.getByTestId('tv-header-end').className).toContain('flex-1');
  });

  it('Given no toast slot, Then no empty slot is drawn', () => {
    render(<TvGameHeader remainingTime={60} timerValue={3} gameMode="classic" t={t} />);
    expect(screen.queryByTestId('tv-header-toast-slot')).toBeNull();
  });

  it('given a classroom header with its own label, when it renders, then the label replaces the LIVE and mode chips and the trailing chip sits on the end', () => {
    render(<TvGameHeader compact remainingTime={60} timerValue={3} gameMode="classic" t={t} leading={<span data-testid="lead" />} trailing={<span data-testid="trail" />} />);
    expect(screen.getByTestId('tv-header-start')).toContainElement(screen.getByTestId('lead'));
    expect(screen.queryByTestId('live-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mode-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('trail')).toBeInTheDocument();
  });
});

describe('TvGameHeader — classroom header stays short and wide', () => {
  it('Given the compact classroom header, Then the timer never zooms past its natural size and the row spans the wall', () => {
    const { container } = render(<TvGameHeader compact remainingTime={60} timerValue={3} t={(k: string) => k} />);
    expect(screen.getByTestId('tv-timer-slot').className).not.toMatch(/zoom:1\.2/);
    expect((container.firstElementChild!.firstElementChild as HTMLElement).className).toMatch(/max-w-\[2000px\]/);
  });

  it('Given an arcade header, Then the row keeps its centred 7xl width', () => {
    const { container } = render(<TvGameHeader remainingTime={60} timerValue={3} t={(k: string) => k} />);
    expect((container.firstElementChild!.firstElementChild as HTMLElement).className).toMatch(/max-w-7xl/);
  });
});
