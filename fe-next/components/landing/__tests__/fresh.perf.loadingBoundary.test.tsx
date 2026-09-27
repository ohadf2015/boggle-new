/**
 * Piece D (perf), SPEC section 10 item 4: the homepage's loading boundaries
 * must not spend first-load bandwidth.
 *
 * 1. `(home)/loading.tsx` (random dancing mascot PNG, 45-94KB) is gone: the
 *    fresh page streams its h1 in the shell, so a homepage-only fallback only
 *    added a hidden `S:` segment + an image fetch in front of it. The homepage
 *    now inherits the generic `[locale]/loading.tsx`.
 * 2. That generic boundary keeps its PageLoader, but the loader's mascot must
 *    not be `priority` (a high-priority preload for an image that is on screen
 *    for a few hundred ms at most). Other PageLoader callers keep the default.
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

import LocaleLoading from '@/app/[locale]/loading';

const APP_LOCALE = path.resolve(__dirname, '../../../app/[locale]');

describe('homepage loading boundary (fresh first load)', () => {
  it('shouldNotShipAHomepageOnlyLoadingFallback', () => {
    // GIVEN the (home) route group
    // THEN it has no loading.tsx of its own
    expect(fs.existsSync(path.join(APP_LOCALE, '(home)', 'loading.tsx'))).toBe(false);
  });

  it('shouldKeepTheGenericLocaleBoundary', () => {
    expect(fs.existsSync(path.join(APP_LOCALE, 'loading.tsx'))).toBe(true);
  });

  it('shouldRenderTheLocaleLoaderWithoutAPriorityImage', () => {
    // GIVEN the generic [locale] boundary
    pageLoaderProps.length = 0;
    const { getByTestId } = render(<LocaleLoading />);
    // THEN it still renders the mascot PageLoader
    expect(getByTestId('page-loader')).toBeTruthy();
    // AND asks it not to preload its mascot image
    expect(pageLoaderProps[0]?.priority).toBe(false);
  });
});
