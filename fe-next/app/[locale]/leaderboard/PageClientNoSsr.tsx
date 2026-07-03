'use client';

import dynamic from 'next/dynamic';

// ssr:false prevents the !isSupabaseEnabled "Coming soon" placeholder from
// appearing in SSR HTML. Server Components can't pass ssr:false to
// next/dynamic, so the dynamic import lives in this client wrapper.
export default dynamic(() => import('./PageClient'), { ssr: false });
