import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// next/dynamic with ssr:false never resolves under jsdom — replace with an
// eager stub that stands in for the lazily-loaded ReportBugModal.
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = (props: { isOpen?: boolean }) =>
      props.isOpen ? <div data-testid="report-bug-modal" /> : null;
    return Stub;
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fb?: string) => (typeof fb === 'string' ? fb : k), language: 'en', dir: 'ltr' }),
}));

import FeedbackFab from '../FeedbackFab';

describe('FeedbackFab', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    // Resolve the idle-defer immediately.
    (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback =
      (cb: () => void) => { cb(); return 1; };
  });

  it('renders the launcher button with an accessible label', () => {
    render(<FeedbackFab />);
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeInTheDocument();
  });

  it('opens the feedback modal on click (no drag)', () => {
    render(<FeedbackFab />);
    const fab = screen.getByRole('button', { name: 'Send feedback' });
    fireEvent.pointerDown(fab, { clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(fab, { clientY: 500, pointerId: 1 });
    expect(screen.getByTestId('report-bug-modal')).toBeInTheDocument();
  });

  it('treats a vertical drag as repositioning, not a click, and persists it', () => {
    render(<FeedbackFab />);
    const fab = screen.getByRole('button', { name: 'Send feedback' });
    fireEvent.pointerDown(fab, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(fab, { clientY: 300, pointerId: 1 }); // drag up 200px
    fireEvent.pointerUp(fab, { clientY: 300, pointerId: 1 });
    expect(screen.queryByTestId('report-bug-modal')).toBeNull();
    expect(parseFloat(localStorage.getItem('lc_feedback_fab_offset') ?? '0')).toBeGreaterThan(0);
  });

  it('restores a previously parked position from localStorage', () => {
    localStorage.setItem('lc_feedback_fab_offset', '180');
    render(<FeedbackFab />);
    const fab = screen.getByRole('button', { name: 'Send feedback' });
    // Drag up 100px more from the parked 180px → 280px persisted
    fireEvent.pointerDown(fab, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(fab, { clientY: 400, pointerId: 1 });
    fireEvent.pointerUp(fab, { clientY: 400, pointerId: 1 });
    expect(localStorage.getItem('lc_feedback_fab_offset')).toBe('280');
  });

  it('lifts itself above fixed bottom bars found by the occlusion scan', async () => {
    // Simulate a 72px bottom tab bar glued to the viewport floor.
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:72px;width:100%;';
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    bar.getBoundingClientRect = () =>
      ({ top: 728, bottom: 800, left: 0, right: 400, width: 400, height: 72, x: 0, y: 728, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(bar);

    render(<FeedbackFab />);
    // MutationObserver + rAF drive the rescan — flush both.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const fab = screen.getByRole('button', { name: 'Send feedback' });
    expect(fab.getAttribute('data-occlusion')).toBe('72');
    document.body.removeChild(bar);
  });
});
