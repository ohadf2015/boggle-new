// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import HomePageClient from './PageClient';

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 *
 * Note: This page uses dynamic rendering (force-dynamic)
 * to ensure live room stats are always fresh
 */
export default function HomePage() {
  return <HomePageClient />;
}
