// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import AboutPageClient from './PageClient';

export default function AboutPage() {
  return <AboutPageClient />;
}
