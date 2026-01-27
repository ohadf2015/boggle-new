'use client';

import React, { useState } from 'react';
import { RefreshCw, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

interface WikipediaSyncSectionProps {
  language: Language;
  onSyncComplete: () => void;
}

export function WikipediaSyncSection({
  language,
  onSyncComplete,
}: WikipediaSyncSectionProps): React.ReactElement {
  const { t } = useLanguage();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    filesProcessed?: number;
    wordsImported?: number;
    error?: string;
  } | null>(null);

  const handleSync = async (): Promise<void> => {
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/daily-word/word-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync-wikipedia',
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync Wikipedia words');
      }

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          filesProcessed: data.result?.filesProcessed || 0,
          wordsImported: data.result?.wordsImported || 0,
        });
        onSyncComplete();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to sync',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-medium text-white">{t('admin.wordBank.wikipediaSync.title')}</h3>
            <p className="text-sm text-gray-400">
              {t('admin.wordBank.wikipediaSync.description')}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing
            ? t('admin.wordBank.wikipediaSync.syncing')
            : t('admin.wordBank.wikipediaSync.syncNow')}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${
            result.success
              ? 'bg-green-500/10 border border-green-500'
              : 'bg-red-500/10 border border-red-500'
          }`}
        >
          {result.success ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-400">
                {t('admin.wordBank.wikipediaSync.success', {
                  files: result.filesProcessed ?? 0,
                  words: result.wordsImported ?? 0,
                })}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-400">{result.error}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
