import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', dir: 'rtl' }),
}));

import { DailyFlowChrome } from '../DailyFlowChrome';

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
