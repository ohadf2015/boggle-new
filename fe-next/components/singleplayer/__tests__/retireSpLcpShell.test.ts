/**
 * The layout LCP shell (#sp-lcp-paint, z-70, never unmounted) covers the
 * results screen once SinglePlayerGame unmounts. Retire it via html[data-sp-ready]
 * without removing the node (LCP must not retarget).
 */
import { renderHook } from '@testing-library/react';
import { useRetireSpLcpShell, SP_LCP_READY_ATTR } from '../retireSpLcpShell';

function paintEl(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'sp-lcp-paint';
  document.body.appendChild(el);
  return el;
}

describe('useRetireSpLcpShell', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(SP_LCP_READY_ATTR);
    document.getElementById('sp-lcp-paint')?.remove();
  });

  afterEach(() => {
    document.documentElement.removeAttribute(SP_LCP_READY_ATTR);
    document.getElementById('sp-lcp-paint')?.remove();
  });

  it('leaves the shell covering during playing (board overlay is the cover)', () => {
    const paint = paintEl();
    renderHook(() => useRetireSpLcpShell('playing'));
    expect(document.documentElement.hasAttribute(SP_LCP_READY_ATTR)).toBe(false);
    expect(paint.hidden).toBe(false);
  });

  it('hides #sp-lcp-paint in results so the signup CTA is not covered', () => {
    const paint = paintEl();
    renderHook(() => useRetireSpLcpShell('results'));
    expect(document.documentElement.getAttribute(SP_LCP_READY_ATTR)).toBe('');
    expect(paint.hidden).toBe(true);
  });

  it('hides the shell in pre-game (tutorial is z-50, below the LCP z-70)', () => {
    renderHook(() => useRetireSpLcpShell('pre-game'));
    expect(document.documentElement.hasAttribute(SP_LCP_READY_ATTR)).toBe(true);
  });

  it('stays retired after results → playing rematch (no mascot flash)', () => {
    const { rerender } = renderHook(
      ({ phase }: { phase: 'playing' | 'results' }) => useRetireSpLcpShell(phase),
      { initialProps: { phase: 'results' as const } },
    );
    expect(document.documentElement.hasAttribute(SP_LCP_READY_ATTR)).toBe(true);
    rerender({ phase: 'playing' });
    expect(document.documentElement.hasAttribute(SP_LCP_READY_ATTR)).toBe(true);
  });

  it('clears the attr on unmount so a later visit can LCP-paint again', () => {
    const { unmount } = renderHook(() => useRetireSpLcpShell('results'));
    expect(document.documentElement.hasAttribute(SP_LCP_READY_ATTR)).toBe(true);
    unmount();
    expect(document.documentElement.hasAttribute(SP_LCP_READY_ATTR)).toBe(false);
  });
});
