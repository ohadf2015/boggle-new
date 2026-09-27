import type { Metadata } from 'next';
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

import BoardCreatorPageClient from './PageClient';

export default function BoardCreatorPage() {
  return <BoardCreatorPageClient />;
}
