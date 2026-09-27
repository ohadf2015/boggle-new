import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useInGameBannerOptIn } from '../useInGameBannerOptIn';

const ALLOW = 'banner-allow-in-game';

function Probe({ enabled }: { enabled?: boolean }) {
  useInGameBannerOptIn(enabled);
  return null;
}

describe('useInGameBannerOptIn', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove(ALLOW);
  });

  it('flags <html>.banner-allow-in-game while mounted so the banner is not suppressed in-game', () => {
    render(<Probe />);
    expect(document.documentElement.classList.contains(ALLOW)).toBe(true);
  });

  it('removes the flag on unmount (game exit re-suppresses the banner)', () => {
    const { unmount } = render(<Probe />);
    expect(document.documentElement.classList.contains(ALLOW)).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains(ALLOW)).toBe(false);
  });

  it('does not flag when disabled', () => {
    render(<Probe enabled={false} />);
    expect(document.documentElement.classList.contains(ALLOW)).toBe(false);
  });
});
