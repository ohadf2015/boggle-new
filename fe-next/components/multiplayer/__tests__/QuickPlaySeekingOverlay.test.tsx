import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickPlaySeekingOverlay } from '../QuickPlaySeekingOverlay';

vi.mock('@/components/ui/SilentVideo', () => ({
  SilentVideo: () => <div data-testid="mascot" />,
}));

const t = (k: string) => k;

/**
 * The Quick Play wait must not be a dead end.
 *
 * `MultiplayerFlow.tsx` returns this overlay *instead of* the entire lobby
 * (`if (isSeekingOverlay) return <QuickPlaySeekingOverlay />`), and the overlay
 * itself was a `fixed inset-0` spinner with no button of any kind: no cancel, no
 * back, no elapsed time, no browse. Until the join resolved or the 10s safety
 * timeout in useMultiplayerJoin fired, the only ways out were waiting or closing
 * the tab — on a surface players are known to rage-tap.
 *
 * (This is a UX dead end on its own merits. It is NOT the cause of the
 * "53% quick-play abandon" figure — that was a telemetry artifact, and real
 * conversion is ~96%. Only 12 join timeouts were ever recorded, from 11 people.)
 */
describe('QuickPlaySeekingOverlay — the wait has an exit', () => {
  it('offers a way back to the lobby', () => {
    render(<QuickPlaySeekingOverlay t={t} onCancel={vi.fn()} />);
    expect(screen.getByTestId('quickplay-seeking-cancel')).toBeInTheDocument();
  });

  it('calls onCancel when the player backs out', () => {
    const onCancel = vi.fn();
    render(<QuickPlaySeekingOverlay t={t} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('quickplay-seeking-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('exposes the exit as a real button so it is keyboard reachable', () => {
    render(<QuickPlaySeekingOverlay t={t} onCancel={vi.fn()} />);
    const btn = screen.getByTestId('quickplay-seeking-cancel');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('hides the exit when the caller cannot handle one', () => {
    render(<QuickPlaySeekingOverlay t={t} />);
    expect(screen.queryByTestId('quickplay-seeking-cancel')).not.toBeInTheDocument();
  });

  it('still announces itself to assistive tech while searching', () => {
    render(<QuickPlaySeekingOverlay t={t} onCancel={vi.fn()} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
