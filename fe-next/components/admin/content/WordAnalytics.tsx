'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';

interface InvalidWord {
  word: string;
  language: string;
  count: number;
  status: string;
}

interface WordAnalyticsData {
  invalidTrends: InvalidWord[];
  totalPending: number;
  totalApproved: number;
}

interface WordAnalyticsProps {
  data: WordAnalyticsData | null;
}

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', he: '🇮🇱', sv: '🇸🇪', ja: '🇯🇵', es: '🇪🇸' };

export function WordAnalytics({ data }: WordAnalyticsProps) {
  const { t } = useLanguage();

  if (!data) {
    return (
      <div data-testid="word-analytics-loading" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-slate-400">{t('admin.content.pendingWords')}</span>
          </div>
          <div className="text-2xl font-neo-display text-neo-white font-bold">{data.totalPending}</div>
        </div>
        <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">{t('admin.content.approvedWords')}</span>
          </div>
          <div className="text-2xl font-neo-display text-neo-white font-bold">{data.totalApproved}</div>
        </div>
      </div>

      {/* Top reported words — dictionary gap detection */}
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-neo-cyan" />
          {t('admin.content.topReported')}
        </h3>

        {data.invalidTrends.length === 0 ? (
          <p className="text-sm text-slate-500">{t('admin.content.noReports')}</p>
        ) : (
          <div className="space-y-1.5">
            {data.invalidTrends.map((item) => (
              <div
                key={`${item.word}-${item.language}`}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-neo-navy-elevated/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{LANG_FLAGS[item.language] ?? '🌐'}</span>
                  <span className="text-sm font-mono text-neo-white">{item.word}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">×{item.count}</span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
