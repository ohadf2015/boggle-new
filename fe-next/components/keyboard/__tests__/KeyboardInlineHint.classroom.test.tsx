import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardInlineHint } from '../KeyboardInlineHint';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...p }: Record<string, unknown> & { children?: React.ReactNode }) => <button {...p}>{children}</button>,
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...p }: Record<string, unknown> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const t = (k: string) => k;

describe('KeyboardInlineHint classroom skin', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('given the arcade board, then the hint stays a navy chip', () => {
    render(<KeyboardInlineHint t={t} />);
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(screen.getByRole('button', { name: 'keyboardInlineHint.fullMessage' }).className).toContain('bg-neo-navy/80');
  });

  it('given a classroom board, then the hint is a cream chip with page ink', () => {
    render(<ClassroomBoardProvider value><KeyboardInlineHint t={t} /></ClassroomBoardProvider>);
    act(() => { vi.advanceTimersByTime(3_000); });
    const hint = screen.getByRole('button', { name: 'keyboardInlineHint.fullMessage' });
    expect(hint).toHaveClass('bg-edu-surface', 'text-edu-ink');
    expect(hint.className).not.toContain('bg-neo-navy');
    expect(hint.innerHTML).not.toMatch(/text-neo-(white|cyan)/);
  });
});
