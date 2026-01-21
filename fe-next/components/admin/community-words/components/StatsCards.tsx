'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { CommunityStats } from '../types';

interface StatsCardsProps {
  stats: CommunityStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
          <span className="text-sm text-slate-500 mb-1">Pending Review</span>
          <span className="text-2xl font-bold text-amber-500">{stats.pendingReview}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
          <span className="text-sm text-slate-500 mb-1">Validated</span>
          <span className="text-2xl font-bold text-green-500">{stats.validated}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
          <span className="text-sm text-slate-500 mb-1">Rejected</span>
          <span className="text-2xl font-bold text-red-500">{stats.rejected}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
          <span className="text-sm text-slate-500 mb-1">Total</span>
          <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">
            {stats.total}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
