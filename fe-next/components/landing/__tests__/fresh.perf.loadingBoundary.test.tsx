/**
 * The homepage and content pages sit outside every loading boundary, so their
 * h1 is in the first HTML instead of a hidden streamed segment. Game and app
 * routes keep the mascot loader, which must not preload its image.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';

const pageLoaderProps: Array<Record<string, unknown>> = [];
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: (props: Record<string, unknown>) => {
    pageLoaderProps.push(props);
    return <div data-testid="page-loader" />;
  },
}));

import RouteLoading from '@/components/ui/RouteLoading';

const APP_LOCALE = path.resolve(__dirname, '../../../app/[locale]');

describe('homepage loading boundary (fresh first load)', () => {
  it('shouldNotShipAHomepageOnlyLoadingFallback', () => {
    // GIVEN the (home) route group
    // THEN it has no loading.tsx of its own
    expect(fs.existsSync(path.join(APP_LOCALE, '(home)', 'loading.tsx'))).toBe(false);
  });

  it('shouldKeepContentPagesOutsideAnyLoadingBoundary', () => {
    for (const dir of ['.', 'faq', 'scrabble-alternative-online']) {
      expect(fs.existsSync(path.join(APP_LOCALE, dir, 'loading.tsx'))).toBe(false);
    }
  });

  it('shouldKeepTheLoaderOnGameRoutes', () => {
    for (const dir of ['blast', 'crossword', 'quick-play', 'daily', 'join']) {
      expect(fs.readFileSync(path.join(APP_LOCALE, dir, 'loading.tsx'), 'utf8')).toContain('@/components/ui/RouteLoading');
    }
  });

  it('shouldRenderTheLocaleLoaderWithoutAPriorityImage', () => {
    // GIVEN the generic [locale] boundary
    pageLoaderProps.length = 0;
    const { getByTestId } = render(<RouteLoading />);
    // THEN it still renders the mascot PageLoader
    expect(getByTestId('page-loader')).toBeTruthy();
    // AND asks it not to preload its mascot image
    expect(pageLoaderProps[0]?.priority).toBe(false);
  });
});
