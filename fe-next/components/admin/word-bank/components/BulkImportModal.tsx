'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';
import type { ValidationStatus } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onImportComplete: () => void;
}

export function BulkImportModal({
  isOpen,
  onClose,
  language,
  onImportComplete,
}: BulkImportModalProps): React.ReactElement | null {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('approved');
  const [source, setSource] = useState<'admin' | 'dictionary' | 'wikipedia'>('admin');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: number;
    errorDetails: Array<{ word: string; error: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async (): Promise<void> => {
    if (!content.trim()) {
      setError(t('admin.wordBank.bulkImport.noContent'));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/daily-word/word-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-import',
          language,
          content,
          source,
          validationStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import words');
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        onImportComplete();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (): void => {
    setContent('');
    setResult(null);
    setError(null);
    onClose();
  };

  const wordCount = content
    .split('\n')
    .filter(line => line.trim())
    .length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neo-navy border-2 border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-neo-yellow" />
            {t('admin.wordBank.bulkImport.title')}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-neo-navy-light rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Instructions */}
          <div className="bg-neo-navy-light border border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-neo-yellow shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-2">{t('admin.wordBank.bulkImport.instructions')}</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>{t('admin.wordBank.bulkImport.formatPlain')}</li>
                  <li>{t('admin.wordBank.bulkImport.formatCsv')}</li>
                  <li>{t('admin.wordBank.bulkImport.lengthFilter')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('admin.wordBank.bulkImport.source')}
              </label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as typeof source)}
                className="w-full bg-neo-navy-light border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow"
              >
                <option value="admin">Admin</option>
                <option value="dictionary">Dictionary</option>
                <option value="wikipedia">Wikipedia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('admin.wordBank.bulkImport.validationStatus')}
              </label>
              <select
                value={validationStatus}
                onChange={e => setValidationStatus(e.target.value as ValidationStatus)}
                className="w-full bg-neo-navy-light border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow"
              >
                <option value="approved">Approved (Add to Dictionary)</option>
                <option value="pending">Pending (Needs Review)</option>
              </select>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('admin.wordBank.bulkImport.wordsLabel')} ({wordCount} words)
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`WORD1
WORD2
WORD3
...`}
              className="w-full h-48 bg-neo-navy-light border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow font-mono text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-neo-navy-light border border-gray-700 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-white">{t('admin.wordBank.bulkImport.result')}</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">{result.imported}</div>
                  <div className="text-xs text-gray-400">{t('admin.wordBank.bulkImport.imported')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{result.skipped}</div>
                  <div className="text-xs text-gray-400">{t('admin.wordBank.bulkImport.skipped')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{result.errors}</div>
                  <div className="text-xs text-gray-400">{t('admin.wordBank.bulkImport.errors')}</div>
                </div>
              </div>
              {result.errorDetails.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                    {t('admin.wordBank.bulkImport.showErrors')}
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto text-xs text-gray-500 font-mono">
                    {result.errorDetails.slice(0, 20).map((err, i) => (
                      <div key={`err-${i}-${err.word}`}>
                        {err.word}: {err.error}
                      </div>
                    ))}
                    {result.errorDetails.length > 20 && (
                      <div className="text-gray-400">
                        ...and {result.errorDetails.length - 20} more
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <Button onClick={handleClose} variant="outline">
            {result ? t('common.close') : t('common.cancel')}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={loading || !content.trim()}
              className="bg-neo-yellow text-black hover:bg-neo-yellow/90"
            >
              {loading ? t('admin.wordBank.bulkImport.importing') : t('admin.wordBank.bulkImport.import')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
