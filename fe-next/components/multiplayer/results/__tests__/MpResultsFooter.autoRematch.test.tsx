/**
 * exp-mp-auto-continue-v1: the series-final footer carries the same ring as
 * the intermission, labelled for a new series, and one tap stops it.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MpFinalFooter, MpIntermissionFooter } from '../MpResultsFooter';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

const final = (over: Partial<React.ComponentProps<typeof MpFinalFooter>> = {}) => ({
  isHost: true, isReady: false, onRematch: vi.fn(), onLeave: vi.fn(), onShare: vi.fn(), t, ...over,
});

describe('MpFinalFooter auto ring', () => {
  it('shows no ring without an active auto (control / classroom)', () => {
    render(<MpFinalFooter {...final()} />);
    expect(screen.queryByTestId('mp-auto-ring')).toBeNull();
    render(<MpFinalFooter {...final({ auto: { active: false, secondsLeft: 10, total: 10, cancel: vi.fn(), labelKey: 'mpUi.results.autoRematchIn' } })} />);
    expect(screen.queryByTestId('mp-auto-ring')).toBeNull();
  });

  it('shows the countdown ring labelled "new series in N" beside REMATCH, and a tap cancels it', () => {
    const cancel = vi.fn();
    render(<MpFinalFooter {...final({ auto: { active: true, secondsLeft: 7, total: 10, cancel, labelKey: 'mpUi.results.autoRematchIn' } })} />);
    const ring = screen.getByTestId('mp-auto-ring');
    expect(ring).toHaveTextContent('7');
    expect(ring.getAttribute('aria-label')).toContain('mpUi.results.autoRematchIn:{"seconds":7}');
    expect(ring.getAttribute('aria-label')).toContain('mpUi.results.cancelAuto');
    expect(screen.getByText('mpUi.results.rematch')).toBeInTheDocument();
    fireEvent.click(ring);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('a joiner who is already in sees the waiting chip and no ring', () => {
    render(<MpFinalFooter {...final({ isHost: false, isReady: true, auto: { active: false, secondsLeft: 10, total: 10, cancel: vi.fn(), labelKey: 'mpUi.results.autoRematchIn' } })} />);
    expect(screen.getByTestId('mp-waiting-host')).toBeInTheDocument();
    expect(screen.queryByTestId('mp-auto-ring')).toBeNull();
  });
});

describe('MpIntermissionFooter ring label', () => {
  it('keeps "next round in N" between rounds', () => {
    render(
      <MpIntermissionFooter
        isHost isClassroom={false} isReady={false} ready={0} total={2}
        auto={{ active: true, secondsLeft: 4, total: 10, cancel: vi.fn() }}
        onStart={vi.fn()} onReady={vi.fn()} t={t}
      />,
    );
    expect(screen.getByTestId('mp-auto-ring').getAttribute('aria-label')).toContain('mpUi.results.autoIn:{"seconds":4}');
  });
});
