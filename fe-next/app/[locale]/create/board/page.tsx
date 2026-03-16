import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import BoardCreatorPageClient from './PageClient';

export default function BoardCreatorPage() {
  return <BoardCreatorPageClient />;
}
