// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: vi.fn(() => ({ online: true, slow: false, type: 'wifi', rttMs: null })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (k: string) => k, language: 'en' })),
}));

import { useNetworkState } from '@/hooks/useNetworkState';
import { ConnectionQualityChip } from '../ConnectionQualityChip';

function setNetwork(opts: { online?: boolean; rttMs?: number | null; slow?: boolean }) {
  vi.mocked(useNetworkState).mockReturnValue({
    online: opts.online ?? true,
    slow: opts.slow ?? false,
    type: 'wifi',
    rttMs: opts.rttMs ?? null,
  });
}

describe('ConnectionQualityChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNetwork({ online: true, rttMs: null });
  });

  it('renders nothing when online and rtt is null (unknown/good)', () => {
    setNetwork({ online: true, rttMs: null });
    const { container } = render(<ConnectionQualityChip />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when online and rtt < 300ms (good)', () => {
    setNetwork({ online: true, rttMs: 120 });
    const { container } = render(<ConnectionQualityChip />);
    expect(container.firstChild).toBeNull();
  });

  it('renders yellow dot when rtt is 300-999ms (degraded)', () => {
    setNetwork({ online: true, rttMs: 500 });
    render(<ConnectionQualityChip />);
    const el = screen.getByRole('status');
    expect(el).toBeInTheDocument();
    expect(el.getAttribute('aria-label')).toContain('mp.quality.degraded');
  });

  it('renders degraded at exactly 300ms', () => {
    setNetwork({ online: true, rttMs: 300 });
    render(<ConnectionQualityChip />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders "Connection weak" chip when rtt >= 1000ms (weak)', () => {
    setNetwork({ online: true, rttMs: 1200 });
    render(<ConnectionQualityChip />);
    const el = screen.getByRole('status');
    expect(el.textContent).toContain('mp.quality.weak');
  });

  it('renders "Reconnecting…" chip when offline', () => {
    setNetwork({ online: false, rttMs: null });
    render(<ConnectionQualityChip />);
    const el = screen.getByRole('status');
    expect(el.textContent).toContain('mp.quality.reconnecting');
  });

  it('offline state takes priority over rtt threshold', () => {
    setNetwork({ online: false, rttMs: 200 });
    render(<ConnectionQualityChip />);
    expect(screen.getByRole('status').textContent).toContain('mp.quality.reconnecting');
  });
});

/**
 * Placement. PageClient mounts the chip in a `fixed top-14 end-2` wrapper —
 * right on top of the phone roster strip and the desktop/TV YOUR WORDS count
 * badge once a round is live. During a round the chip docks itself into the
 * round canvas's bottom-start corner (the mirror of the phone "N found" pill),
 * found by the canvas's own marker, and follows the canvas mounting/unmounting.
 */
describe('ConnectionQualityChip placement', () => {
  function mountCanvas(): HTMLElement {
    const canvas = document.createElement('div');
    canvas.setAttribute('data-testid', 'mp-round-canvas');
    document.body.appendChild(canvas);
    return canvas;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    document.querySelectorAll('[data-testid="mp-round-canvas"]').forEach((n) => n.remove());
  });

  it('with no round canvas, renders in place (the lobby/results fallback slot)', () => {
    setNetwork({ online: true, rttMs: 1200 });
    const { container } = render(<ConnectionQualityChip />);
    expect(container.querySelector('[data-quality="weak"]')).not.toBeNull();
    expect(document.querySelector('[data-quality-slot="round"]')).toBeNull();
  });

  it('with a live round canvas, docks into its bottom-start corner (logical start = RTL-correct)', () => {
    setNetwork({ online: true, rttMs: 1200 });
    const canvas = mountCanvas();
    const { container } = render(<ConnectionQualityChip />);
    expect(container.querySelector('[data-quality]')).toBeNull();
    const slot = canvas.querySelector('[data-quality-slot="round"]') as HTMLElement;
    expect(slot).not.toBeNull();
    expect(slot.className).toContain('absolute');
    expect(slot.className).toContain('bottom-1');
    expect(slot.className).toContain('start-2');
    expect(slot.className).not.toMatch(/\b(left|right)-/);
    expect(slot.className).toContain('pointer-events-none');
    expect(slot.querySelector('[data-quality="weak"]')?.textContent).toContain('mp.quality.weak');
  });

  it('the degraded dot takes the same round slot', () => {
    setNetwork({ online: true, rttMs: 500 });
    const canvas = mountCanvas();
    render(<ConnectionQualityChip />);
    expect(canvas.querySelector('[data-quality-slot="round"] [data-quality="degraded"]')).not.toBeNull();
  });

  it('follows the canvas mounting after the chip, then unmounting', async () => {
    setNetwork({ online: true, rttMs: 1200 });
    const { container } = render(<ConnectionQualityChip />);
    expect(container.querySelector('[data-quality="weak"]')).not.toBeNull();

    const canvas = mountCanvas();
    await waitFor(() => expect(canvas.querySelector('[data-quality="weak"]')).not.toBeNull());
    expect(container.querySelector('[data-quality]')).toBeNull();

    canvas.remove();
    await waitFor(() => expect(container.querySelector('[data-quality="weak"]')).not.toBeNull());
  });

  it('renders nothing anywhere on a healthy link, canvas or not', () => {
    setNetwork({ online: true, rttMs: 120 });
    const canvas = mountCanvas();
    const { container } = render(<ConnectionQualityChip />);
    expect(container.firstChild).toBeNull();
    expect(canvas.childElementCount).toBe(0);
  });
});
