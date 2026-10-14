/**
 * DailyFlowChrome — no pop-in, no lingering chrome:
 *  - skip can be withdrawn once the run is over (results own the way on);
 *  - the intro is decided before paint and still auto-dismisses under
 *    StrictMode (the effect re-run used to read its own "seen" marker, bail
 *    out, and leave the overlay up until tapped);
 *  - static disappear / no rotate spin on the intro art;
 *  - the step label is one interpolated string (word order differs per locale).
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));

import { DailyFlowChrome } from '../DailyFlowChrome';

const src = readFileSync(resolve(__dirname, '../DailyFlowChrome.tsx'), 'utf8');

describe('DailyFlowChrome skip control', () => {
  it('given skip={false} on an optional quest, then no skip link is rendered', () => {
    render(<DailyFlowChrome modeId="connections" intro={false} skip={false} />);
    expect(screen.queryByTestId('skip-optional')).toBeNull();
    expect(screen.getByTestId('back-to-daily')).toBeTruthy();
  });
});

describe('DailyFlowChrome intro', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('given StrictMode, when the intro time elapses, then the overlay dismisses itself', () => {
    render(
      <React.StrictMode>
        <DailyFlowChrome modeId="connections" backLink={false} />
      </React.StrictMode>,
    );
    expect(screen.getByTestId('daily-intro')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId('daily-intro')).toBeNull();
  });

  it('shows the step as a single interpolated label', () => {
    render(<DailyFlowChrome modeId="connections" backLink={false} />);
    expect(screen.getByTestId('daily-intro').textContent).toContain('daily.journeyStepOf:{"n":3,"total":4}');
  });

  it('decides the intro before paint (layout effect), not in a passive effect', () => {
    expect(src).toMatch(/useLayoutEffect/);
    expect(src).not.toMatch(/\buseEffect\b/);
  });

  it('disappears statically and does not spin the intro art', () => {
    expect(src).not.toMatch(/exit=\{\{[^}]*scale/);
    expect(src).not.toMatch(/rotate:/);
  });
});

describe('Word Hunt daily page', () => {
  it('does not stack the chrome intro on top of the game’s own ready screen', () => {
    const page = readFileSync(resolve(__dirname, '../../../../app/[locale]/daily/word-hunt/page.tsx'), 'utf8');
    expect(page).toMatch(/<DailyFlowChrome modeId="word-hunt"[^>]*intro=\{false\}/);
  });
});
