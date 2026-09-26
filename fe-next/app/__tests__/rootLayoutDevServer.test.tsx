/**
 * GrowthRadar resolves its site by host (`/api/u/site?host=…`). On `next dev`
 * that host is localhost, which is not a registered site: both lookups 404
 * and log console errors on every page load (every MP gauntlet capture,
 * 2026-09-26). The tags stay exactly as they are everywhere else, and
 * replayTagHydration.test.ts pins their shape.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('next/script', () => ({
  // data-src (not src) so the @next/next/no-sync-scripts lint rule doesn't fire on the mock
  default: (props: { src?: string }) => <div data-testid="next-script" data-src={props.src} />,
}));
vi.mock('../LazyMotionRoot', () => ({
  LazyMotionRoot: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import RootLayout from '../layout';

const GROWTH_RADAR = [
  'https://growthradar.app/gr.js',
  'https://growthradar.app/gr-extended.js',
  'https://growthradar.app/gr-replay.js',
];

function growthRadarSrcs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-testid="next-script"]'))
    .map((el) => el.getAttribute('data-src') ?? '')
    .filter((src) => src.startsWith('https://growthradar.app/'));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('root layout: GrowthRadar tags and the dev server', () => {
  it('loads gr.js, gr-extended.js and gr-replay.js outside the dev server', () => {
    const { container } = render(<RootLayout><p>page</p></RootLayout>);
    expect(growthRadarSrcs(container)).toEqual(GROWTH_RADAR);
  });

  it('loads none of them on the dev server, and still renders the page', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { container, getByText } = render(<RootLayout><p>page</p></RootLayout>);
    expect(growthRadarSrcs(container)).toEqual([]);
    expect(getByText('page')).toBeTruthy();
  });
});
