'use client';

import dynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';

const PartyView = dynamic(() => import('@/components/party/PartyView'), {
  ssr: false,
  loading: () => <PageLoader size="lg" />,
});

export default function PartyPageClient() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neo-navy">
      <PartyView />
    </div>
  );
}
