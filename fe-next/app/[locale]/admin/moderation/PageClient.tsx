'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';
import { neoErrorToast } from '@/components/NeoToast';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { ModerationQueue } from '@/components/admin/moderation/ModerationQueue';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface QueueItem {
  id: string;
  word: string;
  language: string;
  status: string;
  submission_count?: number;
  created_at: string;
}

export default function ModerationPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { authToken, isLoading: tokenLoading } = useAdminAuth();

  const [queueItems, setQueueItems] = useState<QueueItem[] | null>(null);
  const [queueTotal, setQueueTotal] = useState(0);

  const fetchQueue = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/moderation/queue?limit=50', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      const data = json.data ?? json;
      setQueueItems(data.items ?? []);
      setQueueTotal(data.total ?? 0);
    } catch {
      setQueueItems([]);
    }
  }, [authToken]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleAction = useCallback(async (id: string, action: 'approve' | 'reject') => {
    if (!authToken || actionInProgress) return;
    setActionInProgress(id);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      // Look up the item to get word + language for the backend
      const item = queueItems?.find(i => i.id === id);
      if (!item) {
        logger.warn('Moderation action: item not found in queue', id);
        return;
      }
      // Backend uses 'dismiss' not 'reject'
      const endpoint = action === 'reject' ? 'dismiss' : action;
      const res = await fetch(`/api/admin/invalid-words/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: item.word, language: item.language }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const errorMsg = (data && typeof data.error === 'string' && data.error)
          ? data.error
          : `Failed to ${action} (HTTP ${res.status})`;
        throw new Error(errorMsg);
      }
      // Remove from local state for instant feedback
      setQueueItems(prev => prev?.filter(item => item.id !== id) ?? []);
      setQueueTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'AbortError'
        ? 'Request timed out — please try again'
        : err instanceof Error ? err.message : 'Unknown error';
      logger.warn(`Moderation ${action} failed:`, message);
      neoErrorToast(message, { icon: '⚠️', duration: 4000 });
      // Re-fetch to restore accurate state
      fetchQueue();
    } finally {
      clearTimeout(timeoutId);
      setActionInProgress(null);
    }
  }, [authToken, fetchQueue, actionInProgress, queueItems]);

  const isProfileLoading = !authLoading && user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">{t('admin.accessRequired')}</h1>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">{t('common.backToHome')}</Button>
        </div>
      </div>
    );
  }

  if (authLoading || isProfileLoading || tokenLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden min-h-screen', isRTL && 'rtl')}>
      <Header />
      <div className="flex flex-1">
        <AdminSidebar moderationCount={queueTotal} />
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-neo-display text-neo-white">{t('admin.moderation.title')}</h1>
            <Button variant="ghost" size="sm" onClick={fetchQueue} className="text-slate-400">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <ModerationQueue items={queueItems} total={queueTotal} onAction={handleAction} />
        </main>
      </div>
      <AdminBottomNav moderationCount={queueTotal} />
    </div>
  );
}
