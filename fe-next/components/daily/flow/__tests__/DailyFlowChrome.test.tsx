import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', dir: 'rtl' }),
}));

import { DailyFlowChrome } from '../DailyFlowChrome';
import { markDailyHandoff, consumeDailyHandoff } from '../dailyHandoff';

describe('DailyFlowChrome', () => {
  it('always links back to the daily hub', () => {
    render(<DailyFlowChrome modeId="word-tower" intro={false} />);
    expect(screen.getByTestId('back-to-daily').getAttribute('href')).toBe('/he/daily');
  });
  it('offers skip on optional challenges only', () => {
    const { unmount } = render(<DailyFlowChrome modeId="connections" intro={false} />);
    expect(screen.getByTestId('skip-optional')).toBeTruthy();
    unmount();
    render(<DailyFlowChrome modeId="word-hunt" intro={false} />);
    expect(screen.queryByTestId('skip-optional')).toBeNull();
  });
  it('plays the opening animation once per day', () => {
    sessionStorage.clear();
    const { unmount } = render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.getByTestId('daily-intro')).toBeTruthy();
    unmount();
    render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.queryByTestId('daily-intro')).toBeNull();
  });
});

describe('DailyFlowChrome intro vs an auto-shown tutorial', () => {
  // The host decides its first-visit tutorial in its own layout effect, which
  // runs AFTER the chrome's (child effects first). The chrome must wait for it.
  it('given the host is still deciding, then shows nothing until told; an auto tutorial cancels the intro for good', () => {
    sessionStorage.clear();
    const { rerender } = render(<DailyFlowChrome modeId="connections" backLink={false} introDeferred />);
    expect(screen.queryByTestId('daily-intro')).toBeNull();
    rerender(<DailyFlowChrome modeId="connections" backLink={false} intro={false} />);
    expect(screen.queryByTestId('daily-intro')).toBeNull();
    rerender(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.queryByTestId('daily-intro')).toBeNull();
  });

  it('given the host decides there is no tutorial, then the intro plays as before', () => {
    sessionStorage.clear();
    const { rerender } = render(<DailyFlowChrome modeId="connections" backLink={false} introDeferred />);
    rerender(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.getByTestId('daily-intro')).toBeTruthy();
  });
});

describe('DailyFlowChrome skip', () => {
  // "Skip" on an optional quest used to link to the hub, which is "quit", not
  // "skip": the player had to find Word Tower again themselves.
  it('given an optional quest with a quest after it, skip goes straight to the next quest', () => {
    render(<DailyFlowChrome modeId="connections" intro={false} />);
    expect(screen.getByTestId('skip-optional').getAttribute('href')).toBe('/he/word-tower/daily');
  });
});

describe('DailyFlowChrome placement', () => {
  it('inline nav sits in normal flow, not floating over the game', () => {
    render(<DailyFlowChrome modeId="connections" intro={false} inline />);
    const nav = screen.getByTestId('daily-flow-nav');
    expect(nav.className).not.toMatch(/\bfixed\b/);
  });
  it('word tower daily page keeps only the game’s own back button', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('app/[locale]/word-tower/daily/page.tsx', 'utf8');
    expect(src).toMatch(/modeId="word-tower" backLink=\{false\}/);
  });
});

describe('DailyFlowChrome chain handoff', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('given the player came from the previous quest, then a compact step banner shows instead of the fullscreen intro', () => {
    markDailyHandoff('connections');
    const { unmount } = render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.queryByTestId('daily-intro')).toBeNull();
    const banner = screen.getByTestId('daily-step-banner');
    expect(banner.className).toMatch(/pointer-events-none/);
    expect(banner.textContent).toContain('connections.daily.questTitle');
    unmount();
    render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.queryByTestId('daily-intro')).toBeNull();
  });

  it('given a handoff, when the host shows its own tutorial (intro off), then the banner still shows; it is non-blocking', () => {
    markDailyHandoff('word-hunt');
    render(<DailyFlowChrome modeId="word-hunt" backLink={false} intro={false} />);
    expect(screen.getByTestId('daily-step-banner')).toBeTruthy();
  });

  it('given the host is still deciding, then the banner waits for it', () => {
    markDailyHandoff('connections');
    const { rerender } = render(<DailyFlowChrome modeId="connections" backLink={false} introDeferred />);
    expect(screen.queryByTestId('daily-step-banner')).toBeNull();
    rerender(<DailyFlowChrome modeId="connections" backLink={false} intro={false} />);
    expect(screen.getByTestId('daily-step-banner')).toBeTruthy();
  });

  it('given StrictMode, then the banner hides itself', () => {
    markDailyHandoff('word-tower');
    render(<React.StrictMode><DailyFlowChrome modeId="word-tower" backLink={false} intro={false} /></React.StrictMode>);
    expect(screen.getByTestId('daily-step-banner')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByTestId('daily-step-banner')).toBeNull();
  });

  it('given a handoff meant for another quest, then this quest arrives normally', () => {
    markDailyHandoff('word-tower');
    render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.queryByTestId('daily-step-banner')).toBeNull();
    expect(screen.getByTestId('daily-intro')).toBeTruthy();
  });

  it('skip marks a handoff to the next quest', () => {
    vi.useRealTimers();
    render(<DailyFlowChrome modeId="connections" intro={false} />);
    fireEvent.click(screen.getByTestId('skip-optional'));
    expect(consumeDailyHandoff('word-tower')).toBe(true);
  });
});
