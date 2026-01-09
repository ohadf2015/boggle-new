'use client';

import { NeoLoader } from '@/components/ui/NeoLoader';

/**
 * Loading component for page transitions
 * Features playful bouncing letter tiles animation
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <NeoLoader variant="letters" size="md" />
    </div>
  );
}
