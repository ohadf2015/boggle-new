// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
