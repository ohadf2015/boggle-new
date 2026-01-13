'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Check, X, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GenerationResult {
  success: boolean;
  results: Record<string, { success: boolean; error?: string }>;
  duration: number;
  date: string;
  message?: string;
}

/**
 * DailyBuzzAdminPanel - Admin control panel for Daily Buzz
 * Features:
 * - Manual generation trigger (all languages or single)
 * - Generation status display
 * - Feature flag management link
 */
export default function DailyBuzzAdminPanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const languages = [
    { code: 'all', label: 'All Languages' },
    { code: 'en', label: 'English' },
    { code: 'he', label: 'Hebrew' },
    { code: 'sv', label: 'Swedish' },
    { code: 'ja', label: 'Japanese' },
    { code: 'es', label: 'Spanish' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const adminSecret = prompt('Enter ADMIN_SECRET:');
      if (!adminSecret) {
        setIsGenerating(false);
        return;
      }

      const body: any = { date: selectedDate };
      if (selectedLanguage !== 'all') {
        body.language = selectedLanguage;
      }

      const response = await fetch('/api/cron/generate-daily-buzz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        results: {},
        duration: 0,
        date: selectedDate,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-neo-yellow" />
          <h1 className="text-3xl font-neo-display font-black text-neo-yellow">
            Daily Buzz Admin
          </h1>
        </div>
        <p className="text-slate-400">
          Generate Daily Buzz challenges manually or configure settings
        </p>
      </div>

      {/* Generation Controls */}
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-neo-cyan" />
          Manual Generation
        </h2>

        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-lg text-white focus:border-neo-cyan focus:outline-none"
          />
        </div>

        {/* Language Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Language
          </label>
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                  selectedLanguage === lang.code
                    ? 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-6 text-lg font-black uppercase bg-neo-yellow text-neo-black border-4 border-neo-black rounded-xl shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 me-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 me-2" />
              Generate Daily Buzz
            </>
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          This will generate challenges for {selectedLanguage === 'all' ? 'all languages' : selectedLanguage} on {selectedDate}
        </p>
      </div>

      {/* Results Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border-2 rounded-xl p-6 ${
            result.success
              ? 'bg-green-900/20 border-green-500'
              : 'bg-red-900/20 border-red-500'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {result.success ? (
              <Check className="w-6 h-6 text-green-400" />
            ) : (
              <X className="w-6 h-6 text-red-400" />
            )}
            <h3 className="text-xl font-bold text-white">
              {result.success ? 'Generation Successful' : 'Generation Failed'}
            </h3>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Date</div>
              <div className="font-bold text-white">{result.date}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Duration</div>
              <div className="font-bold text-white flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {(result.duration / 1000).toFixed(2)}s
              </div>
            </div>
          </div>

          {/* Language Results */}
          {Object.keys(result.results).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-400 mb-2">
                Results by Language:
              </div>
              {Object.entries(result.results).map(([lang, status]) => (
                <div
                  key={lang}
                  className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3"
                >
                  <span className="font-medium text-white uppercase">
                    {lang}
                  </span>
                  {status.success ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-xs text-red-400">
                        {status.error}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {!result.success && result.message && (
            <div className="mt-4 p-3 bg-red-900/30 rounded-lg">
              <p className="text-sm text-red-400">{result.message}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Links */}
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-bold text-white mb-3">Quick Links</h2>
        <div className="space-y-2">
          <a
            href="/api/admin/feature-flags"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-lg text-slate-300 hover:border-neo-cyan hover:text-neo-cyan transition-colors"
          >
            📋 Manage Feature Flags (API)
          </a>
          <a
            href="/api/buzz/stats"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-lg text-slate-300 hover:border-neo-cyan hover:text-neo-cyan transition-colors"
          >
            📊 View Statistics (API)
          </a>
        </div>
      </div>
    </motion.div>
  );
}
