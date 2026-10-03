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
});
