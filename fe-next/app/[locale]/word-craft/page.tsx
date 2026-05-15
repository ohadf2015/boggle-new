import { Suspense } from 'react';
import { GameGate } from './GameGate';

export const metadata = {
  title: 'WordCraft Beta — LexiClash',
  robots: { index: false, follow: false },
};

export default function WordCraftPage() {
  return (
    <Suspense>
      <GameGate />
    </Suspense>
  );
}
