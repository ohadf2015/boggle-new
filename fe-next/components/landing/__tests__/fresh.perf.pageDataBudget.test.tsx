/**
 * Piece D (perf), SPEC section 10 item 5: the homepage HTML must not wait on
 * `fetchLandingData` for the fresh tree.
 *
 * The page streams inside the [locale]/loading.tsx boundary, so while
 * HomePage awaited the landing fetch (cold miss: 5 DB round-trips, up to
 * 1.5s) the fresh visitor stared at the loader. The cache TTL is 30s, so on a
 * low-traffic site most homepage requests are cold misses. Fresh visitors never
 * read this data; returning users' hooks (useTopPlayers, useLandingStats, ...)
 * already fetch it client-side when `initialData` is absent.
 *
 * Now: a warm cache (resolves within microtasks) is still passed through; a cold
 * miss ships HTML immediately and the fetch keeps running to warm the cache.
 */
import React from 'react';

const clientProps: Array<Record<string, unknown>> = [];
vi.mock('@/app/[locale]/PageClient', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    clientProps.push(props);
    return null;
  },
}));
const fetchLandingData = vi.fn();
vi.mock('@/lib/landing/fetchLandingData', () => ({
  fetchLandingData: (...a: unknown[]) => fetchLandingData(...a),
}));
vi.mock('@/components/seo/HomepageContentSection', () => ({ HomepageContentSection: () => null }));
vi.mock('@/components/seo/EsScrabbleCrossLink', () => ({ EsScrabbleCrossLink: () => null }));
vi.mock('@/components/seo/SvScrabbleCrossLink', () => ({ SvScrabbleCrossLink: () => null }));
vi.mock('@/components/seo/EnBoggleCrossLink', () => ({ EnBoggleCrossLink: () => null }));

import HomePage from '@/app/[locale]/(home)/page';

const WARM = { topPlayers: [], gamesToday: 7, solveRate: null, gameModeStats: [], cardOrder: [] };

async function clientInitialData(): Promise<unknown> {
  const tree = (await HomePage({ params: Promise.resolve({ locale: 'en' }) })) as React.ReactElement<{
    children: React.ReactElement[];
  }>;
  const kids = React.Children.toArray(tree.props.children) as React.ReactElement<Record<string, unknown>>[];
  const client = kids.find((k) => 'initialData' in (k.props ?? {}));
  return client?.props.initialData;
}

describe('homepage landing-data budget', () => {
  beforeEach(() => {
    clientProps.length = 0;
    fetchLandingData.mockReset();
  });

  it('shouldNotHoldTheHtmlOnAColdLandingFetch', async () => {
    // GIVEN a cold cache whose DB fetch never settles (no wall-clock threshold:
    // if the page ever awaits the fetch again, this test hangs and times out)
    fetchLandingData.mockImplementation(() => new Promise(() => {}));
    // WHEN the page renders
    const data = await clientInitialData();
    // THEN it did not wait for the fetch, and hydrates without SSR data
    expect(data).toBeUndefined();
    // AND the fetch was still started (it warms the cache for the next request)
    expect(fetchLandingData).toHaveBeenCalledWith('en');
  });

  it('shouldStillPassAWarmCacheThroughToReturningUsers', async () => {
    // GIVEN a warm in-memory cache (cachedWithTtl resolves within microtasks)
    fetchLandingData.mockImplementation(async () => WARM);
    const data = await clientInitialData();
    expect(data).toEqual(WARM);
  });

  it('shouldSurviveAFailingFetch', async () => {
    fetchLandingData.mockImplementation(async () => {
      throw new Error('db down');
    });
    await expect(clientInitialData()).resolves.toBeUndefined();
  });
});
