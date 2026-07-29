import type { Metadata } from 'next';
import AvatarTestPageClient from './PageClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AvatarTestPage() {
  return <AvatarTestPageClient />;
}
