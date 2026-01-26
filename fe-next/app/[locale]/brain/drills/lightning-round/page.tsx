// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import LightningRoundPageClient from './PageClient';

export default function LightningRoundPage() {
  return <LightningRoundPageClient />;
}
