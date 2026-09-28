'use client';

import dynamic from 'next/dynamic';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';

/**
 * Thin client boundary for the homepage. `next/dynamic` keeps the heavy
 * `app/[locale]/PageClient` module (LandingView tree) out of the
 * `(home)/page-*.js` chunk. That chunk was showing up as unused JS on
 * /singleplayer because Next ships the locale index page client on nested
 * routes; a stub here is cheap, the real landing code stays on `/` only.
 */
const HomePageClient = dynamic(() => import('../PageClient'), { ssr: true });

export default function HomeClient({ initialData }: { initialData?: LandingInitialData }) {
  return <HomePageClient initialData={initialData} />;
}
