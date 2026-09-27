'use client';

import React, { useState } from 'react';
import { RefreshCw, Globe, Clock, CheckCircle, XCircle, Loader2, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WikipediaWordsStats } from '../types';

interface WikipediaStatsCardProps {
  stats: WikipediaWordsStats;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onTriggerPopulation: () => Promise<boolean>;
  onSyncFromJSON?: () => Promise<unknown>;
}

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatItem({ label, value, icon, color }: StatItemProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neo-navy-light rounded-lg border-2 border-gray-200 dark:border-slate-700">
      <div className={cn('p-2 rounded-lg', color)}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {label}
        </div>
      </div>
    </div>
  );
}

export function WikipediaStatsCard({
  stats,
  loading,
  onRefresh,
  onTriggerPopulation,
  onSyncFromJSON,
}: WikipediaStatsCardProps): React.ReactElement {
  const [isPopulating, setIsPopulating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handlePopulate = async (): Promise<void> => {
    setIsPopulating(true);
    await onTriggerPopulation();
    setIsPopulating(false);
  };

  const handleSyncFromJSON = async (): Promise<void> => {
    if (!onSyncFromJSON) return;
    setIsSyncing(true);
    await onSyncFromJSON();
    setIsSyncing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-neo-cyan" />
          Wikipedia Candidates
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="px-3 py-2 bg-neo-navy-elevated text-white rounded-lg text-sm font-bold hover:bg-slate-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
          {onSyncFromJSON && (
            <button
              type="button"
              onClick={handleSyncFromJSON}
              disabled={loading || isSyncing}
              className="px-3 py-2 bg-neo-cyan text-neo-black rounded-lg text-sm font-bold hover:bg-neo-cyan/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-hard-sm"
              title="Sync pre-validated words from local JSON files to database"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              Sync from JSON
            </button>
          )}
          <button
            type="button"
            onClick={handlePopulate}
            disabled={loading || isPopulating}
            className="px-3 py-2 bg-neo-pink text-white rounded-lg text-sm font-bold hover:bg-neo-pink/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-hard-sm"
          >
            {isPopulating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            Fetch New Words
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatItem
          label="Total"
          value={stats.total}
          icon={<Globe className="w-5 h-5 text-white" />}
          color="bg-slate-600"
        />
        <StatItem
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-5 h-5 text-white" />}
          color="bg-amber-500"
        />
        <StatItem
          label="Valid"
          value={stats.valid}
          icon={<CheckCircle className="w-5 h-5 text-white" />}
          color="bg-green-500"
        />
        <StatItem
          label="Invalid"
          value={stats.invalid}
          icon={<XCircle className="w-5 h-5 text-white" />}
          color="bg-red-500"
        />
      </div>
    </div>
  );
}
