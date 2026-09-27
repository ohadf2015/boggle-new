'use client';

import React from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordBankStats } from '../types';

interface WordBankStatsCardProps {
  stats: WordBankStats;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function WordBankStatsCard({
  stats,
  loading,
  onRefresh,
}: WordBankStatsCardProps): React.ReactElement {
  const { t } = useLanguage();

  return (
    <div className="bg-neo-navy-light border-2 border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-neo-yellow" />
          <h2 className="text-xl font-bold text-white">{t('admin.wordBank.stats.title')}</h2>
        </div>
        <Button
          onClick={onRefresh}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neo-navy border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">{t('admin.wordBank.stats.totalWords')}</div>
          <div className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</div>
        </div>

        <div className="bg-neo-navy border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">{t('admin.wordBank.stats.activeWords')}</div>
          <div className="text-3xl font-bold text-green-400">{stats.active.toLocaleString()}</div>
        </div>

        <div className="bg-neo-navy border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">{t('admin.wordBank.stats.blockedWords')}</div>
          <div className="text-3xl font-bold text-red-400">{stats.blocked.toLocaleString()}</div>
        </div>
      </div>

      {/* Validation Status Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-neo-navy border border-yellow-500/30 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">{t('admin.wordBank.stats.pendingReview')}</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending.toLocaleString()}</div>
        </div>

        <div className="bg-neo-navy border border-green-500/30 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">{t('admin.wordBank.stats.approved')}</div>
          <div className="text-2xl font-bold text-green-400">{stats.approved.toLocaleString()}</div>
        </div>

        <div className="bg-neo-navy border border-red-500/30 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">{t('admin.wordBank.stats.rejected')}</div>
          <div className="text-2xl font-bold text-red-400">{stats.rejected.toLocaleString()}</div>
        </div>
      </div>

      {/* By Source Breakdown */}
      {Object.keys(stats.bySource).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('admin.wordBank.stats.bySource')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(stats.bySource).map(([source, count]) => (
              <div key={source} className="bg-neo-navy border border-gray-700 rounded p-3">
                <div className="text-gray-400 text-xs mb-1 capitalize">{source}</div>
                <div className="text-xl font-bold text-white">{count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
