'use client';

import { NeoLoader } from '@/components/ui/NeoLoader';

/**
 * Profile page loading state
 * Uses playful NeoLoader with mascot variant
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neo-navy via-neo-navy-light to-neo-navy">
      <NeoLoader variant="mascot" size="lg" />
    </div>
  );
}
