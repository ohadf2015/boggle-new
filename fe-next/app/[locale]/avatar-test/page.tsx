import type { Metadata } from 'next';
import AvatarTestPageClient from './PageClient';
import { parseAvatarLabParams } from './fixtures';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AvatarTestPage({ searchParams }: PageProps) {
  const { level, view } = parseAvatarLabParams(await searchParams);
  return (
    <>
      {/* Capture harness only: hide dev-only overlays (Next dev indicator, React Query devtools, get-the-app pill) so screenshots show the product. */}
      <style>{'nextjs-portal,.tsqd-parent-container,.tsqd-open-btn-container,div.fixed.end-0.top-1\\/2{display:none!important}'}</style>
      <AvatarTestPageClient level={level} view={view} />
    </>
  );
}
