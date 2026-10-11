import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LaunchHost } from '../LaunchHost';
import { raiseLaunch, dropLaunch, ARRIVAL_CAP_MS, DEAD_NAV_MS } from '../launchStore';

let pathname = '/en';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => (key === 'landing.launch.go' ? 'GO!' : key), language: 'en', dir: 'ltr' }),
}));

function goTo(path: string, rerender: (ui: React.ReactElement) => void) {
  pathname = path;
  window.history.pushState({}, '', path);
  rerender(<LaunchHost />);
}

function pageShell() {
  const main = document.createElement('main');
  main.id = 'main-content';
  document.body.appendChild(main);
  return main;
}

function routeLoader() {
  const el = document.createElement('div');
  el.setAttribute('data-testid', 'page-loader');
  document.body.appendChild(el);
  return el;
}

describe('LaunchHost', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname = '/en';
    window.history.pushState({}, '', '/en');
    pageShell();
  });
  afterEach(() => {
    act(() => dropLaunch());
    document.querySelectorAll('[data-testid="page-loader"], #main-content').forEach((el) => el.remove());
    vi.useRealTimers();
  });

  it('shows nothing until a launch is raised, then the curtain', () => {
    render(<LaunchHost />);
    expect(screen.queryByTestId('home-launch')).toBeNull();
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow', title: 'Word Wheel' }));
    expect(screen.getByTestId('home-launch')).toHaveTextContent('Word Wheel');
  });

  it('stays up over the next route while its loader shows, and lifts once the page is there', () => {
    const { rerender } = render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow' }));
    const loader = routeLoader();
    act(() => goTo('/en/daily/word-wheel', rerender));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('home-launch')).toBeInTheDocument();

    loader.remove();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('rides through the gap when the route loader hands over to the page\'s own loader', () => {
    const { rerender } = render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow' }));
    const routeLevel = routeLoader();
    act(() => goTo('/en/daily/word-wheel', rerender));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    routeLevel.remove();
    act(() => {
      vi.advanceTimersByTime(70);
    });
    const pageLevel = routeLoader();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('home-launch')).toBeInTheDocument();
    pageLevel.remove();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('waits while the page shell itself is gone (game providers still loading)', () => {
    const { rerender } = render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow' }));
    const shell = document.getElementById('main-content')!;
    shell.remove();
    act(() => goTo('/en/daily/word-wheel', rerender));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('home-launch')).toBeInTheDocument();
    pageShell();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('lifts straight away when the next route paints without a loader', () => {
    const { rerender } = render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow' }));
    act(() => goTo('/en/daily/word-wheel', rerender));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('never outstays a route that keeps its loader up', () => {
    const { rerender } = render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow' }));
    routeLoader();
    act(() => goTo('/en/daily/word-wheel', rerender));
    act(() => {
      vi.advanceTimersByTime(ARRIVAL_CAP_MS + 200);
    });
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('a navigation that never happens does not strand the curtain', () => {
    render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow' }));
    act(() => {
      vi.advanceTimersByTime(DEAD_NAV_MS + 100);
    });
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });

  it('a sticky cover waits on the page that raised it for its owner to drop it', () => {
    render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'quick', tone: 'lime', sticky: true, testId: 'home-quickplay-cover' }));
    act(() => {
      vi.advanceTimersByTime(DEAD_NAV_MS + 5000);
    });
    expect(screen.getByTestId('home-quickplay-cover')).toBeInTheDocument();

    act(() => dropLaunch('other'));
    expect(screen.getByTestId('home-quickplay-cover')).toBeInTheDocument();
    act(() => dropLaunch('quick'));
    expect(screen.queryByTestId('home-quickplay-cover')).toBeNull();
  });

  it('clears on a back-forward cache restore', () => {
    render(<LaunchHost />);
    act(() => raiseLaunch({ id: 'daily', tone: 'yellow' }));
    act(() => {
      const e = new Event('pageshow') as Event & { persisted?: boolean };
      Object.defineProperty(e, 'persisted', { value: true });
      window.dispatchEvent(e);
    });
    expect(screen.queryByTestId('home-launch')).toBeNull();
  });
});
