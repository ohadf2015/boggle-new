'use client';

import React from 'react';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import ConnectionsReviewPanel from '@/components/admin/connections-review/ConnectionsReviewPanel';

export default function PageClient(): React.JSX.Element {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const isProfileLoading = !authLoading && !!user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-neo-navy p-8 text-center text-neo-white">
        <ShieldX className="h-10 w-10 text-neo-red" aria-hidden="true" />
        <p className="text-lg font-bold">Admins only</p>
        <p className="text-sm text-neo-white/60">You don&apos;t have access to the puzzle-review tool.</p>
      </div>
    );
  }

  if (authLoading || isProfileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-navy texture-halftone">
      <ConnectionsReviewPanel />
    </div>
  );
}
