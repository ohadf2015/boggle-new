'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { NeoLoader } from '@/components/ui/NeoLoader';

// Dynamic import for admin panel (client component)
const DailyBuzzAdminPanel = dynamic(
  () => import('@/components/admin/DailyBuzzAdminPanel'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-neo-navy">
        <NeoLoader variant="mascot-letters" size="lg" text="Loading admin panel..." />
      </div>
    ),
  }
);

/**
 * Admin Page: Daily Buzz Management
 *
 * Features:
 * - Manual challenge generation
 * - Feature flag management
 * - Statistics dashboard
 *
 * Access: Admin only (requires ADMIN_SECRET)
 */
export default function DailyBuzzAdminPage() {
  return (
    <div className="min-h-screen bg-neo-navy py-12 px-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-neo-navy">
            <NeoLoader variant="mascot-letters" size="lg" text="Loading..." />
          </div>
        }
      >
        <DailyBuzzAdminPanel />
      </Suspense>
    </div>
  );
}
