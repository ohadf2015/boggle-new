'use client';

import { useState, useEffect } from 'react';
import { Globe, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const BASE_URL = 'https://www.lexiclash.live';

export function IndexNowPanel() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: number; submitted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customUrls, setCustomUrls] = useState('');
  const [mode, setMode] = useState<'all' | 'custom'>('all');
  const [routes, setRoutes] = useState<string[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/indexnow-routes')
      .then(res => res.json())
      .then(data => setRoutes(data.routes || []))
      .catch(() => setRoutes([]))
      .finally(() => setRoutesLoading(false));
  }, []);

  const allUrls = LOCALES.flatMap(l => routes.map(r => `${BASE_URL}/${l}${r}`));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const urls = mode === 'custom'
        ? customUrls.split('\n').map(u => u.trim()).filter(Boolean)
        : undefined;

      const res = await fetch('/api/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(urls ? { body: JSON.stringify({ urls }) } : {}),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-neo-display text-neo-white">IndexNow</h2>
        <span className="text-xs text-slate-400 ms-auto">Bing, Yandex, Naver</span>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Notify search engines about updated pages for faster indexing.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('all')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md transition-colors',
            mode === 'all'
              ? 'bg-cyan-600 text-white'
              : 'bg-neo-navy-elevated text-slate-300 hover:bg-slate-600'
          )}
        >
          All pages ({routesLoading ? '...' : allUrls.length})
        </button>
        <button
          onClick={() => setMode('custom')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md transition-colors',
            mode === 'custom'
              ? 'bg-cyan-600 text-white'
              : 'bg-neo-navy-elevated text-slate-300 hover:bg-slate-600'
          )}
        >
          Custom URLs
        </button>
      </div>

      {mode === 'custom' && (
        <textarea
          value={customUrls}
          onChange={(e) => setCustomUrls(e.target.value)}
          placeholder={`https://www.lexiclash.live/en/daily\nhttps://www.lexiclash.live/he/daily`}
          className="w-full bg-neo-navy border border-slate-600 rounded-md p-3 text-sm text-slate-200 placeholder:text-slate-500 mb-4 min-h-[100px] font-mono"
        />
      )}

      {mode === 'all' && (
        <div className="bg-neo-navy/50 rounded-md p-3 mb-4 max-h-32 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {allUrls.map(url => (
              <span key={url} className="text-xs text-slate-400 truncate">
                {url.replace(BASE_URL, '')}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || (mode === 'custom' && !customUrls.trim())}
        className="bg-cyan-600 hover:bg-cyan-700 text-white"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 me-2 animate-spin" />
        ) : (
          <Send className="w-4 h-4 me-2" />
        )}
        {isSubmitting ? 'Submitting...' : 'Submit to IndexNow'}
      </Button>

      {result && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          Submitted {result.submitted} URLs (status: {result.status})
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
