'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  downloadDictionary,
  deleteDownload,
  listDownloads,
  createIdbStores,
  fetchDictionaryText,
  type DownloadInfo,
} from '@/lib/offline/dictionaryDownload';
import { locales } from '@/i18n/config';
import { Download, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Native language display names
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  he: 'עברית',
  sv: 'Svenska',
  ja: '日本語',
  es: 'Español',
};

export function OfflineDownloadManager() {
  const { t } = useLanguage();
  const { blobStore, keyStore } = useMemo(() => createIdbStores(), []);

  const [downloads, setDownloads] = useState<Record<string, DownloadInfo>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refreshStatus = useCallback(async () => {
    try {
      const list = await listDownloads(blobStore);
      const byLang = Object.fromEntries(list.map((info) => [info.lang, info]));
      setDownloads(byLang);
    } catch (error) {
      console.error('Failed to load download status:', error);
    }
  }, [blobStore]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleDownload = async (lang: string) => {
    setLoading((prev) => ({ ...prev, [lang]: true }));
    setErrors((prev) => ({ ...prev, [lang]: '' }));

    try {
      await downloadDictionary(lang, {
        blobStore,
        keyStore,
        fetchText: fetchDictionaryText,
      });
      await refreshStatus();
    } catch (error) {
      console.error(`Download failed for ${lang}:`, error);
      setErrors((prev) => ({ ...prev, [lang]: t('offlineDownload.errorGeneric') }));
    } finally {
      setLoading((prev) => ({ ...prev, [lang]: false }));
    }
  };

  const handleDelete = async (lang: string) => {
    setLoading((prev) => ({ ...prev, [lang]: true }));
    setErrors((prev) => ({ ...prev, [lang]: '' }));

    try {
      await deleteDownload(lang, blobStore);
      await refreshStatus();
    } catch (error) {
      console.error(`Delete failed for ${lang}:`, error);
      setErrors((prev) => ({ ...prev, [lang]: t('offlineDownload.errorGeneric') }));
    } finally {
      setLoading((prev) => ({ ...prev, [lang]: false }));
    }
  };

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-neo-white mb-2">
          {t('offlineDownload.title')}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {t('offlineDownload.description')}
        </p>
      </div>

      <div className="space-y-3">
        {locales.map((lang) => {
          const info = downloads[lang];
          const isDownloaded = !!info;
          const isLoading = loading[lang] || false;
          const error = errors[lang];

          return (
            <div
              key={lang}
              className={cn(
                'flex items-center justify-between p-4 rounded-neo border-neo',
                'bg-neo-navy-light border-neo-black'
              )}
            >
              <div className="flex-1">
                <p className="font-bold text-neo-white">
                  {LANGUAGE_NAMES[lang] || lang}
                </p>
                {error && (
                  <p className="text-sm text-neo-red mt-1">{error}</p>
                )}
                {!error && isDownloaded && info && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('offlineDownload.downloaded', {
                      size: formatSize(info.sizeBytes),
                      count: info.wordCount,
                    })}
                  </p>
                )}
                {!error && !isDownloaded && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('offlineDownload.notDownloaded')}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  if (isDownloaded) {
                    handleDelete(lang);
                  } else {
                    handleDownload(lang);
                  }
                }}
                disabled={isLoading}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-neo border-neo-black border-2',
                  'font-bold text-sm transition-colors',
                  isLoading
                    ? 'bg-slate-600 text-gray-400 cursor-not-allowed'
                    : isDownloaded
                      ? 'bg-neo-red text-white hover:bg-red-700'
                      : 'bg-neo-cyan text-neo-navy hover:bg-cyan-400'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('offlineDownload.downloading')}</span>
                  </>
                ) : isDownloaded ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t('offlineDownload.deleteButton')}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{t('offlineDownload.downloadButton')}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
