import React from 'react';
import { render, screen } from '@testing-library/react';
import { MpFinalFooter, MpIntermissionFooter } from '../MpResultsFooter';

const t = (k: string) => k;

const intermission = (over: Partial<React.ComponentProps<typeof MpIntermissionFooter>> = {}) => ({
  isHost: false,
  isClassroom: false,
  isReady: true,
  ready: 1,
  total: 4,
  auto: null,
  onStart: vi.fn(),
  onReady: vi.fn(),
  t,
  ...over,
});

const final = (over: Partial<React.ComponentProps<typeof MpFinalFooter>> = {}) => ({
  isHost: false,
  isReady: true,
  onRematch: vi.fn(),
  onLeave: vi.fn(),
  onShare: vi.fn(),
  t,
  ...over,
});

describe('waiting-for-host status chip (GR #10820)', () => {
  it('intermission ready+waiting is a status, not a disabled primary CTA', () => {
    render(<MpIntermissionFooter {...intermission()} />);
    const chip = screen.getByTestId('mp-waiting-host');
    expect(chip.tagName).not.toBe('BUTTON');
    expect(chip).toHaveAttribute('role', 'status');
    expect(chip).toHaveAttribute('aria-live', 'polite');
    expect(chip).toHaveTextContent('mpUi.results.youreReady');
    expect(chip).toHaveTextContent('mpUi.results.waitingHost');
    expect(screen.queryByTestId('mp-primary-cta')).toBeNull();
    expect(chip.className).not.toMatch(/disabled:opacity-100/);
  });

  it('intermission ready+waiting keeps the lime check stamp', () => {
    const { container } = render(<MpIntermissionFooter {...intermission()} />);
    expect(container.querySelector('svg.lucide-check, .lucide-check')).toBeTruthy();
  });

  it('final ready+waiting is the same non-button status chip', () => {
    render(<MpFinalFooter {...final()} />);
    const chip = screen.getByTestId('mp-waiting-host');
    expect(chip.tagName).not.toBe('BUTTON');
    expect(chip).toHaveAttribute('role', 'status');
    expect(chip).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByTestId('mp-primary-cta')).toBeNull();
  });

  it('host still gets an enabled start CTA on intermission', () => {
    render(<MpIntermissionFooter {...intermission({ isHost: true, isReady: false })} />);
    expect(screen.queryByTestId('mp-waiting-host')).toBeNull();
    const cta = screen.getByTestId('mp-primary-cta');
    expect(cta).toBeEnabled();
    expect(cta).toHaveTextContent('mpUi.results.startNext');
  });

  it('host still gets an enabled rematch CTA on final', () => {
    render(<MpFinalFooter {...final({ isHost: true, isReady: false })} />);
    expect(screen.queryByTestId('mp-waiting-host')).toBeNull();
    const cta = screen.getByTestId('mp-primary-cta');
    expect(cta).toBeEnabled();
    expect(cta).toHaveTextContent('mpUi.results.rematch');
  });
});
