'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ShieldAlert, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QueueItem {
  id: string;
  word: string;
  language: string;
  status: string;
  submission_count?: number;
  created_at: string;
}

interface ModerationQueueProps {
  items: QueueItem[] | null;
  total: number;
  onAction: (id: string, action: 'approve' | 'reject') => void;
}

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', he: '🇮🇱', sv: '🇸🇪', ja: '🇯🇵', es: '🇪🇸' };

export function ModerationQueue({ items, total, onAction }: ModerationQueueProps) {
  const { t } = useLanguage();

  if (!items) {
    return (
      <div data-testid="queue-loading" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-neo-pink" />
          {t('admin.moderation.queueTitle')}
        </h3>
        <span className="text-xs bg-neo-pink/20 text-neo-pink font-bold px-2 py-0.5 rounded-full">
          {total}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">{t('admin.moderation.empty')}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 px-2 rounded hover:bg-neo-navy-elevated/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm">{LANG_FLAGS[item.language] ?? '🌐'}</span>
                <span className="text-sm font-mono text-neo-white font-medium">{item.word}</span>
                {item.submission_count && item.submission_count > 1 && (
                  <span className="text-xs text-slate-500">×{item.submission_count}</span>
                )}
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  item.status === 'flagged' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                )}>
                  {item.status}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction(item.id, 'approve')}
                  className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-400/10"
                  aria-label={t('admin.moderation.approve')}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction(item.id, 'reject')}
                  className="h-7 w-7 p-0 text-red-400 hover:bg-red-400/10"
                  aria-label={t('admin.moderation.reject')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
