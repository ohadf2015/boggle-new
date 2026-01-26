// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import FriendsPageClient from './PageClient';

export default function FriendsPage() {
  return <FriendsPageClient />;
}
