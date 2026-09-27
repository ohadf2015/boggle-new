import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const tMock = vi.fn((key: string) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, dir: 'ltr', language: 'en' }),
}));

vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <span data-testid="loader" />,
}));

vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({ online: true, slow: false, type: 'wifi', rttMs: 20 }),
}));

import ArenaCTAStrip from '../ArenaCTAStrip';

describe('ArenaCTAStrip', () => {
  beforeEach(() => {
    tMock.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders both Quick Start and Create buttons', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mpUi.entry.create' })).toBeInTheDocument();
  });

  it('QUICK START catches one glint after first paint (decorative, never in the way)', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} />);
    const glint = screen.getByTestId('cta-glint');
    expect(glint.getAttribute('aria-hidden')).toBe('true');
    expect(glint.className).toContain('pointer-events-none');
    expect(glint.parentElement).toContainElement(screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' }));
  });

  it('invokes onQuickPlay when Quick Start clicked', () => {
    const onQuickPlay = vi.fn();
    render(<ArenaCTAStrip onQuickPlay={onQuickPlay} onCreateRoom={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' }));
    expect(onQuickPlay).toHaveBeenCalledTimes(1);
  });

  it('invokes onCreateRoom when Create clicked', () => {
    const onCreateRoom = vi.fn();
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={onCreateRoom} />);
    fireEvent.click(screen.getByRole('button', { name: 'mpUi.entry.create' }));
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
  });

  it('disables Quick Start and marks it busy while loading', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} isQuickPlayLoading />);
    const cta = screen.getByTestId('arena-quick-start');
    expect(cta).toBeDisabled();
    expect(cta).toHaveAttribute('aria-busy', 'true');
  });

  it('Create is never disabled by Quick Start loading', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} isQuickPlayLoading />);
    expect(screen.getByRole('button', { name: 'mpUi.entry.create' })).not.toBeDisabled();
  });

  it('does not invoke onQuickPlay when disabled', () => {
    const onQuickPlay = vi.fn();
    render(<ArenaCTAStrip onQuickPlay={onQuickPlay} onCreateRoom={vi.fn()} isQuickPlayLoading />);
    fireEvent.click(screen.getByTestId('arena-quick-start'));
    expect(onQuickPlay).not.toHaveBeenCalled();
  });

  // MP rebuild (DESIGN §b.1): the footer is ONE row at every width —
  // [QUICK START 2/3][CREATE 1/3] on phone; on desktop QUICK START is centred
  // at 480px and CREATE moves to the left column (so the footer copy hides).
  it('keeps the CTAs on one row at every width, QUICK START twice as wide', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} />);
    const strip = screen.getByTestId('arena-cta-strip');
    const row = strip.querySelector('[data-cta-row]') as HTMLElement;
    expect(row.className).toMatch(/\bflex\b/);
    expect(row.className).not.toMatch(/flex-col/);
    expect(screen.getByTestId('arena-quick-start').parentElement?.className).toMatch(/flex-\[2\]|flex-2/);
    expect(screen.getByTestId('arena-create-room').className).toMatch(/lg:hidden/);
  });

  // 390px phone: the 1/3 CREATE button has ~93px for its label — `truncate`
  // clipped it to "CREAT…" (r4 review screenshots). The label must wrap to two
  // centred lines inside the 64px button instead of clipping.
  it('CREATE label wraps to two centred lines instead of truncating', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} />);
    const createBtn = screen.getByTestId('arena-create-room');
    const label = createBtn.querySelector('span');
    expect(label).not.toBeNull();
    expect(label!.className).not.toMatch(/truncate/);
    expect(label!.className).not.toMatch(/whitespace-nowrap/);
    expect(label!.className).toMatch(/text-center/);
  });

  // t_0d9276d6: above-fold CTAs must paint visible in the first HTML. An
  // opacity:0 framer entrance hid Quick Start until hydration on mobile.
  it('paints the CTA strip statically (no opacity:0 entrance)', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} />);
    const strip = screen.getByTestId('arena-cta-strip');
    expect(strip).toBeInTheDocument();
    // Enabled Quick Start label — SSR must not regress to "Reconnecting…".
    expect(screen.getByTestId('arena-quick-start')).not.toBeDisabled();
    expect(screen.getByTestId('arena-quick-start').textContent).toContain('roomList.quickStart');
  });
});
