import WordCraftPageClient from './PageClient';

export const metadata = {
  title: 'WordCraft (Admin Sandbox) — LexiClash',
  robots: { index: false, follow: false },
};

export default function WordCraftPage() {
  return <WordCraftPageClient />;
}
