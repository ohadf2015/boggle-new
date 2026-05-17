import { WordCraftClient } from './WordCraftClient';

export const metadata = {
  title: 'WordCraft Beta — LexiClash',
  robots: { index: false, follow: false },
};

export default function WordCraftPage() {
  return <WordCraftClient />;
}
