'use client';

import dynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';

// ssr:false prevents the !isSupabaseEnabled "Coming soon" placeholder from
// appearing in SSR HTML. Server Components can't pass ssr:false to
// next/dynamic, so the dynamic import lives in this client wrapper.
// `loading` paints the branded loader immediately while the heavy
// PageClient chunk (framer-motion, realtime hooks, podium) streams in,
// instead of leaving the page blank until it's fully hydrated — cuts LCP.
export default dynamic(() => import('./PageClient'), { ssr: false, loading: () => <PageLoader /> });
