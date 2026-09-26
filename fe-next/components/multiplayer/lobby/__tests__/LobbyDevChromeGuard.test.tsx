import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { LobbyDevChromeGuard } from '../LobbyDevChromeGuard';

describe('LobbyDevChromeGuard — dev-only floating tools never cover the lobby footer CTA', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('in development, hides the TanStack Query devtools launcher while the lobby is mounted', () => {
    // Given a dev build (the launcher is a fixed 48px button bottom-end, over START/READY)
    vi.stubEnv('NODE_ENV', 'development');
    const { container, unmount } = render(<LobbyDevChromeGuard />);
    // Then a scoped rule hides it
    const style = container.querySelector('style');
    expect(style?.textContent).toMatch(/\.tsqd-open-btn-container\s*\{\s*display:\s*none/);
    // And the rule leaves with the lobby, so ROUND/RESULTS keep the tool
    unmount();
    expect(document.querySelector('style[data-lobby-dev-guard]')).toBeNull();
  });

  it('in production renders nothing (the launcher does not exist there)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(<LobbyDevChromeGuard />);
    expect(container.innerHTML).toBe('');
  });
});
