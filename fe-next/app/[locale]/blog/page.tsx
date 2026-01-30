// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import BlogIndexPageClient from './PageClient';

export default function BlogIndexPage() {
  return <BlogIndexPageClient />;
}
