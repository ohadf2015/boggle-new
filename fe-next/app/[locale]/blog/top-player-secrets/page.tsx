// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import SecretsPageClient from './PageClient';

export const metadata = {
  title: '7 Secrets Top Word Game Players Don\'t Want You to Know | LexiClash Blog',
  description: 'Discover the insider techniques that separate champions from casual players. Learn the psychological tricks, practice methods, and competitive strategies used by the world\'s best word game players.',
};

export default function SecretsPage() {
  return <SecretsPageClient />;
}
