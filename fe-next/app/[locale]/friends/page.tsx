import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import FriendsPageClient from './PageClient';

export default function FriendsPage() {
  return <FriendsPageClient />;
}
