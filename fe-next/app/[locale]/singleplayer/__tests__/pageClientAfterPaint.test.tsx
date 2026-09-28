import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

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

describe('SinglePlayerPageClient defers game hydrate until after first paint', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(0), 0) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id);
    });
  });

  it('does not mount the game view on the first paint', () => {
    const { queryByTestId } = render(<SinglePlayerPageClient />);
    expect(queryByTestId('sp-view')).toBeNull();
    expect(queryByTestId('sp-game-hydrate-pending')).toBeTruthy();
  });

  it('mounts the game view after two animation frames', async () => {
    vi.useFakeTimers();
    const { queryByTestId } = render(<SinglePlayerPageClient />);
    expect(queryByTestId('sp-view')).toBeNull();
    await act(async () => {
      vi.runAllTimers();
    });
    expect(queryByTestId('sp-view')).toBeTruthy();
    vi.useRealTimers();
  });
});
