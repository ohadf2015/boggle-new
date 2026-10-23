import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGAGED_SESSION_KEY } from '@/lib/perf/onFirstEngagement';

vi.mock('next/dynamic', () => ({
  default: () => function MockView() {
    return <div data-testid="sp-view">view</div>;
  },
}));

vi.mock('@/utils/retryImport', () => ({
  retryImport: (factory: () => Promise<unknown>) => factory,
}));

vi.mock('@/components/ChunkErrorBoundary', () => ({
  ChunkErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

import SinglePlayerPageClient from '../PageClient';

describe('SinglePlayerPageClient defers the board past the PSI load window', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(0), 0) as unknown as number;
    });
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('does not mount the game view on the first paint', () => {
    const { queryByTestId } = render(<SinglePlayerPageClient />);
    expect(queryByTestId('sp-view')).toBeNull();
    expect(queryByTestId('sp-game-hydrate-pending')).toBeTruthy();
  });

  it('does not mount on rAF or timers (those run inside a PSI trace)', async () => {
    vi.useFakeTimers();
    const { queryByTestId } = render(<SinglePlayerPageClient />);
    await act(async () => {
      vi.runAllTimers();
    });
    expect(queryByTestId('sp-view')).toBeNull();
  });

  it('does not mount on scroll', async () => {
    const { queryByTestId } = render(<SinglePlayerPageClient />);
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(queryByTestId('sp-view')).toBeNull();
  });

  it('mounts the game view on pointerdown', async () => {
    const { queryByTestId } = render(<SinglePlayerPageClient />);
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(queryByTestId('sp-view')).toBeTruthy();
  });

  it('mounts immediately when a previous page already recorded engagement', async () => {
    sessionStorage.setItem(ENGAGED_SESSION_KEY, '1');
    const { queryByTestId } = render(<SinglePlayerPageClient />);
    await act(async () => {});
    expect(queryByTestId('sp-view')).toBeTruthy();
  });

  it('source keeps the LCP swap ungated and does not use an rAF mount', () => {
    const src = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');
    expect(src).toContain('onFirstEngagement');
    expect(src).toContain('<SpLcpSrcSwap />');
    expect(src).not.toMatch(/requestAnimationFrame/);
  });
});
