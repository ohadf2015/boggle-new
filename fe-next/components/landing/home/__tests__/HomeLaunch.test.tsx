import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LaunchProvider, LaunchCurtain, useHomeLaunch, LAUNCH_HOLD_MS } from '../HomeLaunch';

const push = vi.fn();
const prefetch = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch }),
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('covers the home with the launch curtain on tap and navigates after the hold', () => {
    render(
      <LaunchProvider>
        <LaunchLink />
      </LaunchProvider>,
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

  it('leaves modified clicks (new tab) to the browser', () => {
    render(
      <LaunchProvider>
        <LaunchLink />
      </LaunchProvider>,
    );
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    screen.getByTestId('launch-link').dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(false);
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('navigates at once for players who asked for reduced motion', () => {
    mockReducedMotion(true);
    render(
      <LaunchProvider>
        <LaunchLink />
      </LaunchProvider>,
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
