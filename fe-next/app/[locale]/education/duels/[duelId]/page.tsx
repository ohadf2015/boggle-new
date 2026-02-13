// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import DuelGamePageClient from './PageClient';

export default function DuelGamePage({ params }: { params: { duelId: string } }) {
  return <DuelGamePageClient duelId={params.duelId} />;
}
