import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LaunchProvider, LaunchCurtain, useHomeLaunch, LAUNCH_HOLD_MS } from '../HomeLaunch';
import { LaunchHost } from '../LaunchHost';
import { dropLaunch } from '../launchStore';

const push = vi.fn();
const prefetch = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch }),
  usePathname: () => '/en',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'landing.launch.go' ? 'GO!' : key),
    language: 'en',
    dir: 'ltr',
  }),
}));

function LaunchLink({ href = '/en/daily/word-wheel' }: { href?: string }) {
  const launch = useHomeLaunch();
  return (
    <a
      href={href}
      data-testid="launch-link"
      onClick={(e) => launch?.start(e, { href, tone: 'yellow', title: 'Word Wheel' })}
    >
      go
    </a>
  );
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((q: string) => ({
      matches: reduce && q.includes('reduce'),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('home launch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockReset();
    prefetch.mockReset();
    mockReducedMotion(false);
  });
  afterEach(() => {
    act(() => dropLaunch());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('covers the home with the launch curtain on tap and navigates after the hold', () => {
    render(
      <>
        <LaunchProvider>
          <LaunchLink />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    fireEvent.click(screen.getByTestId('launch-link'), { clientX: 40, clientY: 60 });

    expect(screen.getByTestId('home-launch')).toBeInTheDocument();
    expect(screen.getByTestId('home-launch')).toHaveTextContent('Word Wheel');
    expect(push).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(LAUNCH_HOLD_MS);
    });
    expect(push).toHaveBeenCalledWith('/en/daily/word-wheel');
  });

  it('shows the art the tapped card already loaded, not a cold fetch of the raw file', () => {
    function ArtLink({ href = '/en/daily/word-wheel' }: { href?: string }) {
      const launch = useHomeLaunch();
      return (
        <a
          href={href}
          data-testid="art-link"
          onClick={(e) => launch?.start(e, { href, tone: 'yellow', art: '/modes/cubes/daily.png' })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" data-testid="card-art" src="/_next/image?url=%2Fmodes%2Fcubes%2Fdaily.png&w=384&q=75" />
        </a>
      );
    }
    render(
      <>
        <LaunchProvider>
          <ArtLink />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    const cardArt = screen.getByTestId('card-art');
    Object.defineProperty(cardArt, 'currentSrc', { value: 'http://localhost/_next/image?url=%2Fmodes%2Fcubes%2Fdaily.png&w=384&q=75' });
    fireEvent.click(screen.getByTestId('art-link'));

    const curtainArt = screen.getByTestId('home-launch').querySelector('img');
    expect(curtainArt?.getAttribute('src')).toBe('http://localhost/_next/image?url=%2Fmodes%2Fcubes%2Fdaily.png&w=384&q=75');
  });

  it('keeps the curtain up when the home unmounts for the next route', () => {
    function Shell({ home }: { home: boolean }) {
      return (
        <>
          {home && (
            <LaunchProvider>
              <LaunchLink />
            </LaunchProvider>
          )}
          <LaunchHost />
        </>
      );
    }
    const { rerender } = render(<Shell home />);
    fireEvent.click(screen.getByTestId('launch-link'));
    rerender(<Shell home={false} />);
    expect(screen.getAllByTestId('home-launch')).toHaveLength(1);
  });

  it('leaves modified clicks (new tab) to the browser', () => {
    render(
      <>
        <LaunchProvider>
          <LaunchLink />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    screen.getByTestId('launch-link').dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(false);
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('navigates at once for players who asked for reduced motion', () => {
    mockReducedMotion(true);
    render(
      <>
        <LaunchProvider>
          <LaunchLink />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    fireEvent.click(screen.getByTestId('launch-link'));
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(push).toHaveBeenCalledWith('/en/daily/word-wheel');
  });

  it('is a no-op outside a provider so the link keeps its normal navigation', () => {
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    render(<LaunchLink />);
    screen.getByTestId('launch-link').dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
  });

  it('spells the localized go word as one tile per letter', () => {
    render(<LaunchCurtain tone="lime" />);
    const tiles = screen.getByTestId('home-launch').querySelectorAll('[data-launch-tile]');
    expect(Array.from(tiles).map((el) => el.textContent)).toEqual(['G', 'O', '!']);
  });
});
