import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ChunkErrorBoundary } from '../ChunkErrorBoundary';

const replaceSpy = vi.fn();
const reloadSpy = vi.fn();

beforeEach(() => {
  replaceSpy.mockClear();
  reloadSpy.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: 'https://lexiclash.live/en/multiplayer',
      reload: reloadSpy,
      replace: replaceSpy,
    },
  });
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: { keys: async () => [], delete: async () => true },
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations: async () => [] },
  });
});

afterEach(() => {
  cleanup();
});

function Boom({ message, name }: { message: string; name: string }) {
  throw Object.assign(new Error(message), { name });
}

describe('ChunkErrorBoundary (t_9cc3561f)', () => {
  it('cache-bust navigates on ChunkLoadError', async () => {
    render(
      <ChunkErrorBoundary>
        <Boom name="ChunkLoadError" message="Loading chunk 2703 failed." />
      </ChunkErrorBoundary>,
    );
    await vi.waitFor(() => expect(replaceSpy).toHaveBeenCalledOnce());
    expect(String(replaceSpy.mock.calls[0][0])).toContain('_lc_chunk=');
  });

  it('renders a dependency-free fallback when recovery guard already fired', async () => {
    sessionStorage.setItem('chunk_error_refresh', 'true');
    render(
      <ChunkErrorBoundary>
        <Boom name="ChunkLoadError" message="Loading chunk 2703 failed." />
      </ChunkErrorBoundary>,
    );
    expect(await screen.findByText(/Fresh Update Ready/i)).toBeTruthy();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('shows fallback for non-chunk errors without navigating', async () => {
    render(
      <ChunkErrorBoundary>
        <Boom name="TypeError" message="Cannot read properties of undefined" />
      </ChunkErrorBoundary>,
    );
    expect(await screen.findByText(/Quick Timeout/i)).toBeTruthy();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('Home button routes to /{locale}/education for an education pathname', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'https://lexiclash.live/en/teacher',
        pathname: '/en/teacher',
        reload: reloadSpy,
        replace: replaceSpy,
      },
    });
    render(
      <ChunkErrorBoundary>
        <Boom name="TypeError" message="Cannot read properties of undefined" />
      </ChunkErrorBoundary>,
    );
    const homeBtn = await screen.findByRole('button', { name: /Home/i });
    fireEvent.click(homeBtn);
    expect(window.location.href).toBe('/en/education');
  });

  it('Home button routes to bare /{locale} for a non-education pathname', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'https://lexiclash.live/en/multiplayer',
        pathname: '/en/multiplayer',
        reload: reloadSpy,
        replace: replaceSpy,
      },
    });
    render(
      <ChunkErrorBoundary>
        <Boom name="TypeError" message="Cannot read properties of undefined" />
      </ChunkErrorBoundary>,
    );
    const homeBtn = await screen.findByRole('button', { name: /Home/i });
    fireEvent.click(homeBtn);
    expect(window.location.href).toBe('/en');
  });
});
