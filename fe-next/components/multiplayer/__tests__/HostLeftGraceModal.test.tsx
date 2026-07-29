import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HostLeftGraceModal } from '../HostLeftGraceModal';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string; noDescription?: boolean }) =>
    <div className={className} data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('HostLeftGraceModal (UX audit 2026-05-04 #2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not render when isOpen=false', () => {
    render(<HostLeftGraceModal isOpen={false} onExit={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('renders generic body copy when no reason is supplied', () => {
    render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} />);
    // Mock t() returns the key — assert the generic key landed in the DOM.
    expect(screen.getByTestId('dialog-content').textContent).toContain('multiplayerFlow.hostLeftModal.body');
  });

  it('renders reason-specific body when reason="grace_expired"', () => {
    render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} reason="grace_expired" />);
    expect(screen.getByTestId('dialog-content').textContent).toContain('multiplayerFlow.hostLeftReason.graceExpired');
    expect(screen.getByTestId('dialog-content').textContent).not.toContain('multiplayerFlow.hostLeftModal.body');
  });

  it('renders reason-specific body when reason="host_switched_room"', () => {
    render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} reason="host_switched_room" />);
    expect(screen.getByTestId('dialog-content').textContent).toContain('multiplayerFlow.hostLeftReason.hostSwitchedRoom');
  });

  it('renders reason-specific body when reason="explicit_no_successor"', () => {
    render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} reason="explicit_no_successor" />);
    expect(screen.getByTestId('dialog-content').textContent).toContain('multiplayerFlow.hostLeftReason.explicitNoSuccessor');
  });

  it('renders dialog with countdown when isOpen=true', () => {
    render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('10');
  });

  it('decrements the countdown every second', () => {
    render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('9');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('6');
  });

  it('calls onExit exactly once after seconds elapse', () => {
    const onExit = vi.fn();
    render(<HostLeftGraceModal isOpen={true} onExit={onExit} seconds={3} />);
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('calls onExit when the manual exit button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onExit = vi.fn();
    render(<HostLeftGraceModal isOpen={true} onExit={onExit} seconds={10} />);
    await user.click(screen.getByTestId('host-left-exit-now'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('does not auto-exit after onExit was triggered manually (no double fire)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onExit = vi.fn();
    render(<HostLeftGraceModal isOpen={true} onExit={onExit} seconds={3} />);
    await user.click(screen.getByTestId('host-left-exit-now'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('does not reset the countdown when onExit identity changes mid-countdown', () => {
    // A parent passing an inline onExit re-creates it every render. The countdown
    // interval must not re-register (and reset to `seconds`) on that identity churn.
    const { rerender } = render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('6');
    // Parent re-renders with a brand-new onExit reference — should NOT reset countdown.
    rerender(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} />);
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('6');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('4');
  });

  it('fires the latest onExit when countdown ends, even if onExit changed mid-countdown', () => {
    const firstOnExit = vi.fn();
    const secondOnExit = vi.fn();
    const { rerender } = render(<HostLeftGraceModal isOpen={true} onExit={firstOnExit} seconds={3} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender(<HostLeftGraceModal isOpen={true} onExit={secondOnExit} seconds={3} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(firstOnExit).not.toHaveBeenCalled();
    expect(secondOnExit).toHaveBeenCalledTimes(1);
  });

  it('resets the countdown when isOpen flips false→true', () => {
    const { rerender } = render(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('6');
    rerender(<HostLeftGraceModal isOpen={false} onExit={vi.fn()} seconds={10} />);
    rerender(<HostLeftGraceModal isOpen={true} onExit={vi.fn()} seconds={10} />);
    expect(screen.getByTestId('host-left-countdown').textContent).toContain('10');
  });
});
